import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../utils/logger";
import { User } from "../interfaces/model";

const USERS_TABLE = "Users";

const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  role: Joi.string()
    .valid("client", "employee", "business_admin", "super_admin")
    .optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
}).min(1);

const assignRoleSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string()
    .valid("client", "employee", "business_admin", "super_admin")
    .required(),
  business_id: Joi.number().integer().optional(),
  branch_id: Joi.number().integer().allow(null).optional(),
  position: Joi.string().allow(null, "").optional(),
  bio: Joi.string().allow(null, "").optional(),
});

const canManageUsers = (role?: string) =>
  role === "super_admin" || role === "business_admin";

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!canManageUsers(req.user.role)) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  const { error, value } = listUsersSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid query", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const { page, limit, role } = value;
    const offset = (page - 1) * limit;
    const query = knex(USERS_TABLE).select("id", "name", "email", "phone", "role");
    if (role) query.where({ role });

    const users = await query.offset(offset).limit(limit);
    const totalObj = await knex(USERS_TABLE)
      .count("* as total")
      .modify((qb) => {
        if (role) qb.where({ role });
      })
      .first();

    res.status(200).json({
      users,
      meta: { total: Number(totalObj?.total || 0), page, limit },
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!canManageUsers(req.user.role)) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  try {
    const user = await knex(USERS_TABLE)
      .select("id", "name", "email", "phone", "role")
      .where({ id: Number(req.params.id) })
      .first();

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUserByAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!canManageUsers(req.user.role)) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  const { error, value } = updateUserSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const updated = await knex(USERS_TABLE)
      .where({ id: Number(req.params.id) })
      .update({ ...value, updated_at: new Date() });

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "User updated" });
  } catch (err) {
    next(err);
  }
};

export const deleteUserByAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!canManageUsers(req.user.role)) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  try {
    const deleted = await knex(USERS_TABLE).where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

export const assignRoleToUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!canManageUsers(req.user.role)) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  const { error, value } = assignRoleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    await knex.transaction(async (trx) => {
      const user = await trx<User>(USERS_TABLE).where({ email: value.email }).first();
      if (!user) {
        res.status(404).json({ message: "User not found" });
        throw new Error("rollback");
      }

      if (value.role === "super_admin" && req.user.role !== "super_admin") {
        res.status(403).json({ message: "Not allowed to assign super_admin" });
        throw new Error("rollback");
      }

      await trx(USERS_TABLE)
        .where({ email: value.email })
        .update({ role: value.role, updated_at: trx.fn.now() });

      if (value.role === "employee") {
        if (!value.business_id) {
          res.status(400).json({ message: "business_id is required for employee role" });
          throw new Error("rollback");
        }

        const existing = await trx("EmployeeProfiles")
          .where({ user_id: user.id })
          .first();
        const payload = {
          user_id: user.id,
          business_id: value.business_id,
          branch_id: value.branch_id ?? null,
          position: value.position ?? null,
          bio: value.bio ?? null,
          is_active: true,
          updated_at: trx.fn.now(),
        };

        if (existing) {
          await trx("EmployeeProfiles").where({ id: existing.id }).update(payload);
        } else {
          await trx("EmployeeProfiles").insert(payload);
        }
      }

      res.status(200).json({ message: `Role ${value.role} assigned to ${value.email}` });
    });
  } catch (err) {
    if ((err as Error).message !== "rollback") {
      logger.error("Error assigning role", { error: err });
      next(err);
    }
  }
};

export const getEmployeesByDistrict = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branchId = Number(req.params.id);
    const employees = await knex("EmployeeProfiles as ep")
      .join("Users as u", "ep.user_id", "u.id")
      .where("ep.branch_id", branchId)
      .andWhere("u.role", "employee")
      .select("ep.*", "u.name", "u.email", "u.phone");

    res.status(200).json(employees);
  } catch (err) {
    next(err);
  }
};
