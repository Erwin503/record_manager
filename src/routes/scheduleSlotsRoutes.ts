import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import * as controller from "../controllers/scheduleSlotsController";

const router = express.Router();

router.get("/", controller.getScheduleSlots);
router.get("/employee/:employeeId", controller.getEmployeeSchedule);
router.post("/", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), controller.createScheduleSlot);
router.put("/:id", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), controller.updateScheduleSlot);
router.delete("/:id", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), controller.deleteScheduleSlot);

export default router;
