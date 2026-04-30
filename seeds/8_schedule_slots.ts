import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const profiles = await knex("EmployeeProfiles").select("id", "branch_id");
  const now = new Date();

  for (const profile of profiles) {
    const existing = await knex("ScheduleSlots").where({ employee_id: profile.id }).first();
    if (existing) continue;

    const slots = [];
    for (let day = 1; day <= 5; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      date.setHours(9, 0, 0, 0);
      const startsAt = new Date(date);
      const endsAt = new Date(date);
      endsAt.setHours(18, 0, 0, 0);

      slots.push({
        employee_id: profile.id,
        branch_id: profile.branch_id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "available",
        source: "generated",
      });
    }

    await knex("ScheduleSlots").insert(slots);
    logger.info(`Seeded schedule slots for employee ${profile.id}`);
  }
}
