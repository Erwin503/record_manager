import { Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";
import { upsertYandexCalendarConnection } from "../utils/yandexCalendarService";

const connectSchema = Joi.object({
  employeeId: Joi.number().integer().required(),
  username: Joi.string().min(1).required(),
  app_password: Joi.string().min(1).required(),
  calendar_url: Joi.string().uri().optional(),
});

export const connectYandexCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = connectSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const employee = await knex("EmployeeProfiles")
      .where({ id: value.employeeId })
      .first();
    if (!employee) {
      res.status(404).json({
        message: "Employee profile not found",
        details: "employeeId should be EmployeeProfiles.id.",
      });
      return;
    }

    if (req.user.role === "employee" && employee.user_id !== req.user.id) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const connectionId = await upsertYandexCalendarConnection({
      employeeId: employee.id,
      username: value.username,
      appPassword: value.app_password,
      calendarUrl: value.calendar_url,
    });

    res.status(200).json({
      message: "Yandex Calendar connected",
      connectionId,
      employeeId: employee.id,
    });
  } catch (err) {
    next(err);
  }
};

export const disconnectYandexCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await knex("YandexCalendarConnections")
      .where({ employee_id: Number(req.params.employeeId) })
      .update({ is_active: false, updated_at: new Date() });

    if (!updated) {
      res.status(404).json({ message: "Yandex Calendar connection not found" });
      return;
    }

    res.status(200).json({ message: "Yandex Calendar disconnected" });
  } catch (err) {
    next(err);
  }
};
