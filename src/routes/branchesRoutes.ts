import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import * as controller from "../controllers/branchesController";

const router = express.Router();

router.get("/", controller.getBranches);
router.get("/:id", controller.getBranchById);
router.post("/", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.createBranch);
router.put("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.updateBranch);
router.delete("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), controller.deleteBranch);

export default router;
