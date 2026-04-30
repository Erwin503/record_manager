import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import * as controller from "../controllers/servicesController";

const router = express.Router();
const manage = [authenticateToken, checkRole(["business_admin", "super_admin"])];

router.get("/categories", controller.getCategories);
router.post("/categories", ...manage, controller.createCategory);
router.get("/variants", controller.getServiceVariants);
router.post("/variants", ...manage, controller.createServiceVariant);
router.get("/", controller.getServices);
router.get("/:id", controller.getServiceById);
router.post("/", ...manage, controller.createService);
router.put("/:id", ...manage, controller.updateService);
router.delete("/:id", ...manage, controller.deleteService);

export default router;
