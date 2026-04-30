import { Response, NextFunction } from "express";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../utils/logger";
import { buildAppointmentEmailContent, sendEmail } from "../utils/mailService";

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const notifications = await knex("Notifications")
      .where({ user_id: req.user.id })
      .orderBy("created_at", "desc");

    res.status(200).json(notifications);
  } catch (err) {
    logger.error("Error fetching notifications", { error: err });
    next(err);
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const updated = await knex("Notifications")
      .where({ id, user_id: req.user.id })
      .update({ is_read: true });

    if (!updated) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    logger.error("Error marking notification as read", { error: err });
    next(err);
  }
};

export const sendBookingConfirmationEmail = async (
  userId: number,
  appointmentId: number
): Promise<void> => {
  const user = await knex("Users")
    .select("id", "email", "name")
    .where({ id: userId })
    .first();

  if (!user?.email) {
    logger.warn("User not found or email missing", { userId });
    return;
  }

  const { subject, html } = await buildAppointmentEmailContent(
    appointmentId,
    user.name || "Client"
  );
  const title = "Appointment created";
  await createNotification(user.id, title, "email", html, appointmentId);
  await sendEmail(user.email, subject, html, title);
};

export const createNotification = async (
  userId: number,
  title: string,
  type: string,
  message?: string,
  appointmentId?: number
) => {
  try {
    await knex("Notifications").insert({
      user_id: userId,
      appointment_id: appointmentId ?? null,
      title,
      message,
      type,
    });
  } catch (err) {
    logger.error("Error creating notification", { error: err });
  }
};
