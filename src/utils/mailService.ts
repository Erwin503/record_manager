import nodemailer from "nodemailer";
import logger from "./logger";
import knex from "../db/knex";
import { generateAppointmentQrCode } from "./qrService";

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
  port: Number(process.env.SMTP_PORT) || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  fromName = "Record Manager"
) => {
  try {
    const from = `"${fromName}" <${process.env.SMTP_USER}>`;
    await mailTransporter.sendMail({ from, to, subject, html });
    logger.info(`Email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error("Email send failed", { error });
    throw error;
  }
};

export const generateAppointmentEmailHtml = (
  fullName: string,
  serviceName: string,
  variantName: string,
  startsAt: string,
  endsAt: string,
  businessName: string,
  branchAddress?: string,
  qrCodeBase64?: string
): string => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 8px; padding: 24px;">
        <h2 style="color: #2a9d8f;">Appointment confirmation</h2>
        <p>Hello, <strong>${fullName}</strong>.</p>
        <p>Your appointment has been created.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold;">Business:</td><td style="padding: 8px;">${businessName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Service:</td><td style="padding: 8px;">${serviceName} - ${variantName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Time:</td><td style="padding: 8px;">${startsAt} - ${endsAt}</td></tr>
          ${branchAddress ? `<tr><td style="padding: 8px; font-weight: bold;">Address:</td><td style="padding: 8px;">${branchAddress}</td></tr>` : ""}
        </table>
        ${
          qrCodeBase64
            ? `<p style="margin-top: 24px;">Show this QR code at the visit:</p>
               <img src="${qrCodeBase64}" alt="QR Code" style="max-width: 200px; border: 1px solid #ddd; padding: 8px;" />`
            : ""
        }
      </div>
    </div>
  `;
};

export const buildAppointmentEmailContent = async (
  appointmentId: number,
  userName: string
): Promise<{ subject: string; html: string }> => {
  const appointment = await knex("Appointments as a")
    .join("Businesses as b", "a.business_id", "b.id")
    .join("Services as s", "a.service_id", "s.id")
    .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
    .leftJoin("Branches as br", "a.branch_id", "br.id")
    .where("a.id", appointmentId)
    .select(
      "a.starts_at",
      "a.ends_at",
      "b.name as business_name",
      "s.name as service_name",
      "sv.name as variant_name",
      "br.address as branch_address"
    )
    .first();

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const { qrCode } = await generateAppointmentQrCode(appointmentId);
  const startsAt = new Date(appointment.starts_at).toLocaleString();
  const endsAt = new Date(appointment.ends_at).toLocaleString();

  const html = generateAppointmentEmailHtml(
    userName,
    appointment.service_name,
    appointment.variant_name,
    startsAt,
    endsAt,
    appointment.business_name,
    appointment.branch_address,
    qrCode
  );

  return {
    subject: `Appointment confirmation - ${startsAt}`,
    html,
  };
};
