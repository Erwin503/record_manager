import knex from "../db/knex";
import { AppointmentStatus } from "../enum/appointmentEnum";
import { createNotification } from "../controllers/notificationController";
import logger from "./logger";

const REMINDER_TYPE_CLIENT_24H = "client_24h";
const REMINDER_TYPE_REBOOK = "rebook";
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_LOOKAHEAD_HOURS = 24;
const DEFAULT_WINDOW_MINUTES = 10;

const getNumberEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const formatAppointmentDate = (value: string | Date) =>
  new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

export const scheduleRebookReminder = async (appointmentId: number) => {
  const appointment = await knex("Appointments as a")
    .join("Services as s", "a.service_id", "s.id")
    .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
    .where("a.id", appointmentId)
    .select(
      "a.id",
      "a.client_id",
      "a.ends_at",
      "s.name as service_name",
      "sv.name as service_variant_name",
      "sv.rebook_reminder_days"
    )
    .first();

  if (!appointment?.client_id || !appointment.rebook_reminder_days) return;

  const scheduledFor = new Date(appointment.ends_at);
  scheduledFor.setDate(scheduledFor.getDate() + Number(appointment.rebook_reminder_days));

  const existingReminder = await knex("AppointmentReminders")
    .where({
      appointment_id: appointment.id,
      user_id: appointment.client_id,
      reminder_type: REMINDER_TYPE_REBOOK,
    })
    .first();

  if (existingReminder) return;

  await knex("AppointmentReminders").insert({
    appointment_id: appointment.id,
    user_id: appointment.client_id,
    reminder_type: REMINDER_TYPE_REBOOK,
    scheduled_for: scheduledFor,
    sent_at: null,
  });
};

export const sendDueAppointmentReminders = async () => {
  const lookaheadHours = getNumberEnv("APPOINTMENT_REMINDER_LOOKAHEAD_HOURS", DEFAULT_LOOKAHEAD_HOURS);
  const windowMinutes = getNumberEnv("APPOINTMENT_REMINDER_WINDOW_MINUTES", DEFAULT_WINDOW_MINUTES);

  const now = new Date();
  const windowStart = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000 - windowMinutes * 60 * 1000);
  const windowEnd = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000 + windowMinutes * 60 * 1000);

  const appointments = await knex("Appointments as a")
    .join("Services as s", "a.service_id", "s.id")
    .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
    .join("EmployeeProfiles as ep", "a.employee_id", "ep.id")
    .join("Users as eu", "ep.user_id", "eu.id")
    .leftJoin("AppointmentReminders as ar", function joinReminder() {
      this.on("ar.appointment_id", "=", "a.id")
        .andOn("ar.user_id", "=", "a.client_id")
        .andOnVal("ar.reminder_type", "=", REMINDER_TYPE_CLIENT_24H);
    })
    .whereNotNull("a.client_id")
    .whereNull("ar.id")
    .whereNotIn("a.status", [
      AppointmentStatus.CANCELED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ])
    .andWhere("a.starts_at", ">=", windowStart)
    .andWhere("a.starts_at", "<", windowEnd)
    .select(
      "a.id",
      "a.client_id",
      "a.starts_at",
      "a.client_name",
      "s.name as service_name",
      "sv.name as service_variant_name",
      "eu.name as employee_name"
    )
    .orderBy("a.starts_at", "asc");

  for (const appointment of appointments) {
    try {
      await knex.transaction(async (trx) => {
        const existingReminder = await trx("AppointmentReminders")
          .where({
            appointment_id: appointment.id,
            user_id: appointment.client_id,
            reminder_type: REMINDER_TYPE_CLIENT_24H,
          })
          .first();

        if (existingReminder) return;

        await createNotification(
          appointment.client_id,
          "Напоминание о записи",
          "internal",
          `Завтра у вас запись: ${appointment.service_name} (${appointment.service_variant_name}) к ${appointment.employee_name} на ${formatAppointmentDate(appointment.starts_at)}.`,
          appointment.id
        );

        await trx("AppointmentReminders").insert({
          appointment_id: appointment.id,
          user_id: appointment.client_id,
          reminder_type: REMINDER_TYPE_CLIENT_24H,
          scheduled_for: appointment.starts_at,
          sent_at: new Date(),
        });
      });
    } catch (err) {
      logger.error("Failed to send appointment reminder", {
        error: err,
        appointmentId: appointment.id,
        clientId: appointment.client_id,
      });
    }
  }

  if (appointments.length) {
    logger.info("Appointment reminders processed", { count: appointments.length });
  }

  const rebookReminders = await knex("AppointmentReminders as ar")
    .join("Appointments as a", "ar.appointment_id", "a.id")
    .join("Services as s", "a.service_id", "s.id")
    .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
    .leftJoin("Users as cu", "ar.user_id", "cu.id")
    .where({ "ar.reminder_type": REMINDER_TYPE_REBOOK })
    .whereNull("ar.sent_at")
    .andWhere("ar.scheduled_for", "<=", new Date())
    .select(
      "ar.id",
      "ar.appointment_id",
      "ar.user_id",
      "ar.scheduled_for",
      "s.name as service_name",
      "sv.name as service_variant_name"
    );

  for (const reminder of rebookReminders) {
    try {
      await knex.transaction(async (trx) => {
        const freshReminder = await trx("AppointmentReminders")
          .where({ id: reminder.id })
          .whereNull("sent_at")
          .first();
        if (!freshReminder) return;

        await createNotification(
          reminder.user_id,
          "Пора записаться снова",
          "internal",
          `Рекомендуем повторную запись: ${reminder.service_name} (${reminder.service_variant_name}).`,
          reminder.appointment_id
        );

        await trx("AppointmentReminders")
          .where({ id: reminder.id })
          .update({ sent_at: new Date() });
      });
    } catch (err) {
      logger.error("Failed to send rebook reminder", {
        error: err,
        reminderId: reminder.id,
        appointmentId: reminder.appointment_id,
        userId: reminder.user_id,
      });
    }
  }

  if (rebookReminders.length) {
    logger.info("Rebook reminders processed", { count: rebookReminders.length });
  }
};

export const startAppointmentReminderScheduler = () => {
  const intervalMs = getNumberEnv("APPOINTMENT_REMINDER_INTERVAL_MS", DEFAULT_INTERVAL_MS);

  const run = () => {
    sendDueAppointmentReminders().catch((error) => {
      logger.error("Appointment reminder scheduler failed", { error });
    });
  };

  run();
  const timer = setInterval(run, intervalMs);
  logger.info("Appointment reminder scheduler started", { intervalMs });
  return timer;
};
