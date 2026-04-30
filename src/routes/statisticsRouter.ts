import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import {
  getAttendanceByDirection,
  getCancellationDynamics,
  getLoadHeatmap,
} from "../controllers/statisticsController";

const router = express.Router();

router.use(authenticateToken, checkRole(["business_admin", "super_admin"]));

router.get("/services", getAttendanceByDirection);
router.get("/cancellations", getCancellationDynamics);
router.get("/load-heatmap", getLoadHeatmap);

export default router;
