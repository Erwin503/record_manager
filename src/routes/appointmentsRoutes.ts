import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as controller from "../controllers/appointmentsController";

const router = express.Router();

router.get("/available-employees", controller.getAvailableEmployees);
router.get("/available-times", controller.getAvailableTimes);

router.use(authenticateToken);
router.get("/", controller.getAppointments);
router.get("/:id", controller.getAppointmentById);
router.post("/", controller.bookAppointment);
router.patch("/:id/status", controller.changeAppointmentStatus);
router.patch("/:id/cancel", controller.cancelAppointment);
router.patch("/:id/complete", controller.completeAppointment);

export default router;
