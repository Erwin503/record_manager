import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import {
  connectYandexCalendar,
  disconnectYandexCalendar,
} from "../controllers/calendarController";

const router = express.Router();

router.post("/yandex/connect", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), connectYandexCalendar);
router.delete("/yandex/:employeeId", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), disconnectYandexCalendar);

export default router;
