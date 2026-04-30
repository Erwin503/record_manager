import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import knex from "../db/knex";

export const generateAppointmentQrCode = async (appointmentId: number) => {
  const appointment = await knex("Appointments").where({ id: appointmentId }).first();
  if (!appointment) throw new Error("Appointment not found");

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const url = `${process.env.BASE_URL || "http://localhost:3000"}/api/qr/access/${token}`;

  await knex("AppointmentQrTokens").insert({
    token,
    appointment_id: appointmentId,
    expires_at: expiresAt,
    used: false,
  });

  const qrCode = await QRCode.toDataURL(url);

  return { token, expiresAt, url, qrCode };
};
