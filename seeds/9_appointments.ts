import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const clients = await knex("Users").where({ role: "client" });
  const slots = await knex("ScheduleSlots").where({ status: "available" }).limit(4);

  if (!clients.length || !slots.length) {
    logger.info("No clients or schedule slots found, skipping appointments seed.");
    return;
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const client = clients[i % clients.length];
    const employee = await knex("EmployeeProfiles").where({ id: slot.employee_id }).first();
    const link = await knex("EmployeeServiceVariants")
      .where({ employee_id: employee.id })
      .first();
    if (!employee || !link) continue;

    const variant = await knex("ServiceVariants as sv")
      .join("Services as s", "sv.service_id", "s.id")
      .where("sv.id", link.service_variant_id)
      .select("sv.*", "s.id as service_id", "s.business_id")
      .first();
    if (!variant) continue;

    const startsAt = new Date(slot.starts_at);
    const endsAt = new Date(startsAt.getTime() + Number(variant.duration_minutes) * 60 * 1000);

    const exists = await knex("Appointments")
      .where({ employee_id: employee.id, starts_at: startsAt })
      .first();
    if (exists) continue;

    const [appointmentId] = await knex("Appointments").insert({
      business_id: variant.business_id,
      branch_id: employee.branch_id,
      service_id: variant.service_id,
      service_variant_id: variant.id,
      employee_id: employee.id,
      client_id: client.id,
      schedule_slot_id: slot.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: i % 2 === 0 ? "confirmed" : "pending",
      price_snapshot: variant.price,
      duration_snapshot_minutes: variant.duration_minutes,
      client_name: client.name,
      client_phone: client.phone,
      client_email: client.email,
      comment: "Seed appointment",
    });

    await knex("AppointmentCalendarEvents").insert({
      appointment_id: appointmentId,
      employee_id: employee.id,
      calendar_id: "",
      sync_status: "pending",
    });
    logger.info(`Seeded appointment ${appointmentId}`);
  }
}
