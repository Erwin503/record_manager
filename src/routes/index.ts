import express from "express";
import userRoutes from "./authRoutes";
import adminRoutes from "./adminRoutes";
import businessRoutes from "./businessRoutes";
import branchesRoutes from "./branchesRoutes";
import servicesRoutes from "./servicesRoutes";
import employeeProfilesRoutes from "./employeeProfilesRoutes";
import scheduleSlotsRoutes from "./scheduleSlotsRoutes";
import appointmentsRoutes from "./appointmentsRoutes";
import qrCodeRoutes from "./qrCodeRoutes";
import notificationRoutes from "./notificationRoutes";
import statRoutes from "./statisticsRouter";
import calendarRoutes from "./calendarRoutes";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/businesses", businessRoutes);
router.use("/branches", branchesRoutes);
router.use("/services", servicesRoutes);
router.use("/employees", employeeProfilesRoutes);
router.use("/schedule-slots", scheduleSlotsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/qr", qrCodeRoutes);
router.use("/notification", notificationRoutes);
router.use("/stats", statRoutes);
router.use("/calendar", calendarRoutes);

export default router;
