import { Request, Response, NextFunction } from "express";
import knex from "../db/knex";
import logger from "../utils/logger";
import { generateAppointmentQrCode } from "../utils/qrService";
import { AuthRequest } from "../middleware/authMiddleware";

export const generateQrForAppointment = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
) => {
  const { appointmentId } = req.body;
  const user = req.user;

  if (!appointmentId || typeof appointmentId !== "number") {
    res.status(400).json({ error: "appointmentId is required and must be a number" });
    return;
  }

  try {
    if (user.role === "client") {
      const appointment = await knex("Appointments")
        .select("id", "client_id")
        .where({ id: appointmentId })
        .first();

      if (!appointment) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }

      if (appointment.client_id !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    const { token, expiresAt, url, qrCode } = await generateAppointmentQrCode(appointmentId);

    res.status(201).json({
      token,
      appointmentId,
      expiresAt,
      url,
      qrCode,
    });
  } catch (err: any) {
    logger.error("Error generating QR", { error: err });
    res.status(500).json({ error: err.message || "QR generation failed" });
  }
};

export const getAppointmentFromQrToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.params;

  try {
    const qrToken = await knex("AppointmentQrTokens").where({ token }).first();

    if (!qrToken) {
      res.status(404).json({ message: "QR code not found" });
      return;
    }

    const now = new Date();
    if (qrToken.expires_at && qrToken.expires_at < now) {
      res.status(410).json({ message: "QR code expired" });
      return;
    }

    res.status(200).json({
      appointmentId: qrToken.appointment_id,
      message: "QR code is valid",
    });
  } catch (err) {
    logger.error("Error handling QR access", { error: err });
    next(err);
  }
};
