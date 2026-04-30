import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import * as controller from "../controllers/businessController";

const router = express.Router();

router.get("/", controller.getBusinesses);
router.get("/:id", controller.getBusinessById);
router.post("/", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.createBusiness);
router.put("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.updateBusiness);
router.delete("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.deleteBusiness);

export default router;
