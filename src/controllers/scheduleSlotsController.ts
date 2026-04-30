import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";

const slotSchema = Joi.object({
  employee_id: Joi.number().integer().optional(),
  branch_id: Joi.number().integer().allow(null).optional(),
  starts_at: Joi.date().required(),
  ends_at: Joi.date().greater(Joi.ref("starts_at")).required(),
  status: Joi.string().valid("available", "blocked").default("available"),
  source: Joi.string().valid("manual", "generated").default("manual"),
});

export const getScheduleSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("ScheduleSlots").orderBy("starts_at", "asc");
    if (req.query.employee_id) query.where({ employee_id: Number(req.query.employee_id) });
    if (req.query.branch_id) query.where({ branch_id: Number(req.query.branch_id) });
    if (req.query.status) query.where({ status: String(req.query.status) });
    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getEmployeeSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await knex("ScheduleSlots")
      .where({ employee_id: Number(req.params.employeeId) })
      .orderBy("starts_at", "asc");
    res.status(200).json(slots);
  } catch (err) {
    next(err);
  }
};

export const createScheduleSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = slotSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    let employeeId = value.employee_id;
    if (req.user.role === "employee") {
      const profile = await knex("EmployeeProfiles").where({ user_id: req.user.id }).first();
      if (!profile) {
        res.status(404).json({ message: "Employee profile not found" });
        return;
      }
      employeeId = profile.id;
    }
    if (!employeeId) {
      res.status(400).json({ message: "employee_id is required" });
      return;
    }

    const [id] = await knex("ScheduleSlots").insert({ ...value, employee_id: employeeId });
    res.status(201).json(await knex("ScheduleSlots").where({ id }).first());
  } catch (err) {
    next(err);
  }
};

export const updateScheduleSlot = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = slotSchema.fork(["starts_at", "ends_at"], (field) => field.optional()).min(1).validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const updated = await knex("ScheduleSlots").where({ id: Number(req.params.id) }).update({ ...value, updated_at: new Date() });
    if (!updated) {
      res.status(404).json({ message: "Schedule slot not found" });
      return;
    }
    res.status(200).json(await knex("ScheduleSlots").where({ id: Number(req.params.id) }).first());
  } catch (err) {
    next(err);
  }
};

export const deleteScheduleSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await knex("ScheduleSlots").where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "Schedule slot not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
