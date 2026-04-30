import express from "express";
import * as qrCodeController from "../controllers/qrCodeController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post(
  "/generate",
  authenticateToken,
  qrCodeController.generateQrForAppointment
);
router.get("/access/:token", qrCodeController.getAppointmentFromQrToken);
export default router;
