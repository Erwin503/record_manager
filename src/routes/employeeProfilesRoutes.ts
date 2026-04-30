import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import * as controller from "../controllers/employeeProfilesController";

const router = express.Router();

router.get("/", controller.getEmployees);
router.get("/me", authenticateToken, controller.getMyEmployeeProfiles);
router.get("/:id", controller.getEmployeeById);
router.post("/", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), controller.createEmployeeProfile);
router.put("/:id", authenticateToken, checkRole(["employee", "business_admin", "super_admin"]), controller.updateEmployeeProfile);
router.delete("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.deleteEmployeeProfile);
router.post("/:id/service-variants", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.assignServiceVariant);
router.delete("/:id/service-variants/:variantId", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.removeServiceVariant);

export default router;
