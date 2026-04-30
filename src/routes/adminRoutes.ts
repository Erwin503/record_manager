import express from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/checkRole";
import {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
  assignRoleToUser,
  getEmployeesByDistrict,
} from "../controllers/adminController";

const router = express.Router();

router.get("/", authenticateToken, checkRole(["business_admin", "super_admin"]), getAllUsers);
router.get("/users", authenticateToken, checkRole(["business_admin", "super_admin"]), getAllUsers);
router.get("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), getUserById);
router.put("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), updateUserByAdmin);
router.delete("/:id", authenticateToken, checkRole(["business_admin", "super_admin"]), deleteUserByAdmin);
router.post("/assign-role", authenticateToken, checkRole(["business_admin", "super_admin"]), assignRoleToUser);
router.get("/branches/:id/employees", getEmployeesByDistrict);

export default router;
