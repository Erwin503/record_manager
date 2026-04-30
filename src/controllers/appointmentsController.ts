import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppointmentStatus } from "../enum/appointmentEnum";
import { createNotification } from "./notificationController";
import {
  CalendarSyncError,
  createAppointmentCalendarEventOrFail,
  deleteAppointmentCalendarEvent,
  updateAppointmentCalendarEvent,
} from "../utils/yandexCalendarService";

const appointmentSchema = Joi.object({
  service_variant_id: Joi.number().integer().required(),
  employee_id: Joi.number().integer().required(),
  branch_id: Joi.number().integer().allow(null).optional(),
  client_id: Joi.number().integer().allow(null).optional(),
  starts_at: Joi.date().required(),
  client_name: Joi.string().min(1).optional(),
  client_phone: Joi.string().allow(null, "").optional(),
  client_email: Joi.string().email().allow(null, "").optional(),
  comment: Joi.string().allow(null, "").optional(),
});

const employeesQuerySchema = Joi.object({
  business_id: Joi.number().integer().required(),
  service_variant_id: Joi.number().integer().required(),
  branch_id: Joi.number().integer().optional(),
});

const availabilityQuerySchema = Joi.object({
  service_variant_id: Joi.number().integer().required(),
  business_id: Joi.number().integer().optional(),
  branch_id: Joi.number().integer().optional(),
  employee_id: Joi.number().integer().optional(),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid(
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELED,
      AppointmentStatus.NO_SHOW
    )
    .required(),
  cancel_reason: Joi.string().allow(null, "").optional(),
});

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const CANCELLATION_DEADLINE_HOURS = 24;

const isWithinSlot = (startsAt: Date, endsAt: Date, slot: any) => {
  const slotStart = new Date(slot.starts_at);
  const slotEnd = new Date(slot.ends_at);
  return startsAt >= slotStart && endsAt <= slotEnd;
};

const hasOverlap = (startsAt: Date, endsAt: Date, busyIntervals: any[]) =>
  busyIntervals.some((busy) => {
    const busyStart = new Date(busy.starts_at);
    const busyEnd = new Date(busy.ends_at);
    return startsAt < busyEnd && endsAt > busyStart;
  });

export const getAvailableEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = employeesQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid query", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const query = knex("EmployeeProfiles as ep")
      .join("Users as u", "ep.user_id", "u.id")
      .join("EmployeeServiceVariants as esv", "ep.id", "esv.employee_id")
      .leftJoin("Branches as b", "ep.branch_id", "b.id")
      .where("ep.business_id", value.business_id)
      .where("ep.is_active", true)
      .where("esv.service_variant_id", value.service_variant_id)
      .select(
        "ep.id",
        "ep.business_id",
        "ep.branch_id",
        "ep.position",
        "ep.bio",
        "ep.photo_url",
        "u.name",
        "u.email",
        "u.phone",
        "b.name as branch_name",
        "b.address as branch_address"
      )
      .orderBy("u.name", "asc");

    if (value.branch_id) {
      query.where((builder) => {
        builder.where("ep.branch_id", value.branch_id).orWhereNull("ep.branch_id");
      });
    }

    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getAvailableTimes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = availabilityQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid query", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const variant = await knex("ServiceVariants as sv")
      .join("Services as s", "sv.service_id", "s.id")
      .where("sv.id", value.service_variant_id)
      .select("sv.duration_minutes", "s.business_id")
      .first();
    if (!variant) {
      res.status(404).json({ message: "Service variant not found" });
      return;
    }

    const from = value.from ? new Date(value.from) : new Date();
    const to = value.to ? new Date(value.to) : addMinutes(from, 14 * 24 * 60);
    const duration = Number(variant.duration_minutes);

    const slotsQuery = knex("ScheduleSlots as ss")
      .join("EmployeeProfiles as ep", "ss.employee_id", "ep.id")
      .join("EmployeeServiceVariants as esv", "ep.id", "esv.employee_id")
      .join("Users as u", "ep.user_id", "u.id")
      .where("ss.status", "available")
      .where("ep.is_active", true)
      .where("esv.service_variant_id", value.service_variant_id)
      .where("ss.ends_at", ">", from)
      .where("ss.starts_at", "<", to)
      .select(
        "ss.id as work_interval_id",
        "ss.employee_id",
        "ss.branch_id",
        "ss.starts_at",
        "ss.ends_at",
        "ep.business_id",
        "u.name as employee_name"
      )
      .orderBy("ss.starts_at", "asc");

    if (value.business_id) slotsQuery.where("ep.business_id", value.business_id);
    else slotsQuery.where("ep.business_id", variant.business_id);
    if (value.branch_id) {
      slotsQuery.where((builder) => {
        builder.where("ss.branch_id", value.branch_id).orWhereNull("ss.branch_id");
      });
    }
    if (value.employee_id) slotsQuery.where("ss.employee_id", value.employee_id);

    const slots = await slotsQuery;
    const employeeIds = [...new Set(slots.map((slot) => slot.employee_id))];
    const appointments = employeeIds.length
      ? await knex("Appointments")
          .whereIn("employee_id", employeeIds)
          .whereNotIn("status", [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW])
          .andWhere("starts_at", "<", to)
          .andWhere("ends_at", ">", from)
          .select("employee_id", "starts_at", "ends_at")
      : [];

    const busyByEmployee = appointments.reduce((acc: Record<number, any[]>, appointment) => {
      acc[appointment.employee_id] = acc[appointment.employee_id] || [];
      acc[appointment.employee_id].push(appointment);
      return acc;
    }, {});

    const availability = slots.flatMap((slot) => {
      const candidates = [];
      const slotStart = new Date(slot.starts_at);
      const slotEnd = new Date(slot.ends_at);
      let cursor = new Date(Math.max(slotStart.getTime(), from.getTime()));
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0);

      while (addMinutes(cursor, duration) <= slotEnd && cursor < to) {
        const candidateEnd = addMinutes(cursor, duration);
        if (!hasOverlap(cursor, candidateEnd, busyByEmployee[slot.employee_id] || [])) {
          candidates.push({
            work_interval_id: slot.work_interval_id,
            employee_id: slot.employee_id,
            employee_name: slot.employee_name,
            branch_id: slot.branch_id,
            starts_at: cursor.toISOString(),
            ends_at: candidateEnd.toISOString(),
            duration_minutes: duration,
          });
        }

        cursor = addMinutes(cursor, 15);
      }

      return candidates;
    });

    res.status(200).json(availability);
  } catch (err) {
    next(err);
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = appointmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  const trx = await knex.transaction();
  let transactionCommitted = false;
  try {
    const variant = await trx("ServiceVariants as sv")
      .join("Services as s", "sv.service_id", "s.id")
      .where("sv.id", value.service_variant_id)
      .select("sv.*", "s.id as service_id", "s.business_id")
      .first();
    if (!variant) {
      await trx.rollback();
      res.status(404).json({ message: "Service variant not found" });
      return;
    }

    const employee = await trx("EmployeeProfiles").where({ id: value.employee_id }).first();
    if (!employee || employee.business_id !== variant.business_id) {
      await trx.rollback();
      res.status(400).json({ message: "Employee does not match selected service business" });
      return;
    }

    const canPerform = await trx("EmployeeServiceVariants")
      .where({ employee_id: value.employee_id, service_variant_id: value.service_variant_id })
      .first();
    if (!canPerform) {
      await trx.rollback();
      res.status(400).json({ message: "Employee cannot perform selected service variant" });
      return;
    }

    const startsAt = new Date(value.starts_at);
    const endsAt = new Date(startsAt.getTime() + Number(variant.duration_minutes) * 60 * 1000);
    const branchId = value.branch_id ?? employee.branch_id ?? null;

    if (branchId) {
      const branch = await trx("Branches")
        .where({ id: branchId, business_id: variant.business_id })
        .first();
      if (!branch) {
        await trx.rollback();
        res.status(400).json({ message: "Branch does not match selected service business" });
        return;
      }
    }

    const workIntervalQuery = trx("ScheduleSlots")
      .where({
        employee_id: value.employee_id,
        status: "available",
      })
      .andWhere("starts_at", "<=", startsAt)
      .andWhere("ends_at", ">=", endsAt)
      .forUpdate();

    if (branchId) {
      workIntervalQuery.andWhere((builder) => {
        builder.where("branch_id", branchId).orWhereNull("branch_id");
      });
    }

    const workInterval = await workIntervalQuery.orderBy("starts_at", "asc").first();
    if (!workInterval || !isWithinSlot(startsAt, endsAt, workInterval)) {
      await trx.rollback();
      res.status(400).json({ message: "Selected time does not fit inside employee working interval" });
      return;
    }

    const overlap = await trx("Appointments")
      .where({ employee_id: value.employee_id })
      .whereNotIn("status", [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW])
      .andWhere("starts_at", "<", endsAt)
      .andWhere("ends_at", ">", startsAt)
      .forUpdate()
      .first();
    if (overlap) {
      await trx.rollback();
      res.status(409).json({ message: "Employee is busy for selected time" });
      return;
    }

    const [id] = await trx("Appointments").insert({
      business_id: variant.business_id,
      branch_id: branchId,
      service_id: variant.service_id,
      service_variant_id: value.service_variant_id,
      employee_id: value.employee_id,
      client_id: value.client_id ?? req.user.id,
      schedule_slot_id: workInterval.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: AppointmentStatus.PENDING,
      price_snapshot: variant.price,
      duration_snapshot_minutes: variant.duration_minutes,
      client_name: value.client_name ?? req.user.name ?? "Client",
      client_phone: value.client_phone,
      client_email: value.client_email,
      comment: value.comment,
    });

    await trx("AppointmentCalendarEvents").insert({
      appointment_id: id,
      employee_id: value.employee_id,
      calendar_id: "",
      sync_status: "pending",
    });

    await createAppointmentCalendarEventOrFail(id, trx);
    await trx.commit();
    transactionCommitted = true;
    await createNotification(req.user.id, "Запись создана", "internal", `Создана запись №${id}`);
    res.status(201).json(await knex("Appointments").where({ id }).first());
  } catch (err) {
    if (!transactionCommitted) {
      await trx.rollback();
    }
    if (err instanceof CalendarSyncError) {
      res.status(502).json({
        message: "Appointment was not created because calendar sync failed",
        details: err.message,
      });
      return;
    }
    next(err);
  }
};

export const getAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = knex("Appointments as a")
      .join("Services as s", "a.service_id", "s.id")
      .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
      .join("EmployeeProfiles as ep", "a.employee_id", "ep.id")
      .join("Users as eu", "ep.user_id", "eu.id")
      .select(
        "a.*",
        "s.name as service_name",
        "sv.name as service_variant_name",
        "eu.name as employee_name"
      )
      .orderBy("a.starts_at", "desc");

    if (req.user.role === "client") query.where("a.client_id", req.user.id);
    if (req.query.business_id) query.where("a.business_id", Number(req.query.business_id));
    if (req.query.employee_id) query.where("a.employee_id", Number(req.query.employee_id));

    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getAppointmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await knex("Appointments").where({ id: Number(req.params.id) }).first();
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    if (req.user.role === "client" && appointment.client_id !== req.user.id) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
};

export const changeAppointmentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = statusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  const trx = await knex.transaction();
  try {
    const appointment = await trx("Appointments").where({ id: Number(req.params.id) }).first();
    if (!appointment) {
      await trx.rollback();
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (value.status === AppointmentStatus.CANCELED) {
      const cancellationDeadline = new Date(appointment.starts_at).getTime() - CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000;
      if (Date.now() > cancellationDeadline) {
        await trx.rollback();
        res.status(400).json({
          message: "Appointment can be canceled no later than 24 hours before start time",
        });
        return;
      }
    }

    await trx("Appointments")
      .where({ id: appointment.id })
      .update({
        status: value.status,
        cancel_reason: value.cancel_reason ?? appointment.cancel_reason,
        updated_at: trx.fn.now(),
      });

    await trx("AppointmentCalendarEvents")
      .where({ appointment_id: appointment.id })
      .update({
        sync_status: value.status === AppointmentStatus.CANCELED ? "deleted" : "pending",
        updated_at: trx.fn.now(),
      });

    await trx.commit();
    if (value.status === AppointmentStatus.CANCELED) {
      await deleteAppointmentCalendarEvent(appointment.id);
    } else {
      await updateAppointmentCalendarEvent(appointment.id);
    }
    res.status(200).json(await knex("Appointments").where({ id: appointment.id }).first());
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

export const cancelAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = AppointmentStatus.CANCELED;
  return changeAppointmentStatus(req, res, next);
};

export const completeAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.body.status = AppointmentStatus.COMPLETED;
  return changeAppointmentStatus(req, res, next);
};
