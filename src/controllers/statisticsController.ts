import { Response, NextFunction } from "express";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../utils/logger";

export const getAttendanceByDirection = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await knex("Appointments as a")
      .join("Services as s", "a.service_id", "s.id")
      .where("a.status", "completed")
      .groupBy("s.id", "s.name")
      .select("s.name")
      .count("a.id as count");

    const result = rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.name] = typeof row.count === "string" ? parseInt(row.count, 10) : row.count;
      return acc;
    }, {});

    res.status(200).json(result);
  } catch (err) {
    logger.error("Error fetching service attendance stats", { error: err });
    next(err);
  }
};

export const getCancellationDynamics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const days = parseInt((req.query.days as string) || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await knex("Appointments")
      .where("status", "canceled")
      .andWhere("updated_at", ">=", since)
      .groupByRaw("DATE(updated_at)")
      .select(knex.raw("DATE(updated_at) AS date"), knex.raw("COUNT(*) AS count"));

    res.status(200).json(
      rows.map((row: any) => ({
        date: row.date,
        count: typeof row.count === "string" ? parseInt(row.count, 10) : row.count,
      }))
    );
  } catch (err) {
    logger.error("Error fetching cancellation dynamics", { error: err });
    next(err);
  }
};

export const getLoadHeatmap = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await knex("Appointments")
      .whereIn("status", ["confirmed", "in_progress", "completed"])
      .groupByRaw("DAYOFWEEK(starts_at), HOUR(starts_at)")
      .select(
        knex.raw("DAYOFWEEK(starts_at) AS day_of_week"),
        knex.raw("HOUR(starts_at) AS hour"),
        knex.raw("COUNT(*) AS count")
      );

    res.status(200).json(
      rows.map((row: any) => ({
        day_of_week: typeof row.day_of_week === "string" ? parseInt(row.day_of_week, 10) : row.day_of_week,
        hour: typeof row.hour === "string" ? parseInt(row.hour, 10) : row.hour,
        count: typeof row.count === "string" ? parseInt(row.count, 10) : row.count,
      }))
    );
  } catch (err) {
    logger.error("Error fetching load heatmap", { error: err });
    next(err);
  }
};
