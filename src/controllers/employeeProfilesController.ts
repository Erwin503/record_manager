import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";

const profileSchema = Joi.object({
  user_id: Joi.number().integer().optional(),
  business_id: Joi.number().integer().required(),
  branch_id: Joi.number().integer().allow(null).optional(),
  position: Joi.string().allow(null, "").optional(),
  bio: Joi.string().allow(null, "").optional(),
  photo_url: Joi.string().allow(null, "").optional(),
  is_active: Joi.boolean().default(true),
});

const serviceVariantSchema = Joi.object({
  service_variant_id: Joi.number().integer().required(),
});

const isDuplicateEmployeeProfileError = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: string }).code === "ER_DUP_ENTRY";

export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("EmployeeProfiles as ep")
      .join("Users as u", "ep.user_id", "u.id")
      .leftJoin("Branches as b", "ep.branch_id", "b.id")
      .select(
        "ep.*",
        "u.name",
        "u.email",
        "u.phone",
        "b.name as branch_name",
        "b.address as branch_address"
      )
      .orderBy("u.name", "asc");

    if (req.query.business_id) query.where("ep.business_id", Number(req.query.business_id));
    if (req.query.branch_id) query.where("ep.branch_id", Number(req.query.branch_id));

    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await knex("EmployeeProfiles as ep")
      .join("Users as u", "ep.user_id", "u.id")
      .leftJoin("Branches as b", "ep.branch_id", "b.id")
      .select("ep.*", "u.name", "u.email", "u.phone", "b.name as branch_name")
      .where("ep.id", Number(req.params.id))
      .first();
    if (!employee) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }
    const serviceVariants = await knex("EmployeeServiceVariants as esv")
      .join("ServiceVariants as sv", "esv.service_variant_id", "sv.id")
      .join("Services as s", "sv.service_id", "s.id")
      .where("esv.employee_id", employee.id)
      .select("sv.*", "s.name as service_name");
    res.status(200).json({ ...employee, serviceVariants });
  } catch (err) {
    next(err);
  }
};

export const getMyEmployeeProfiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profiles = await knex("EmployeeProfiles").where({ user_id: req.user.id });
    res.status(200).json(profiles);
  } catch (err) {
    next(err);
  }
};

export const createEmployeeProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const userId = req.user.role === "employee" ? req.user.id : value.user_id;
    if (!userId) {
      res.status(400).json({ message: "user_id is required" });
      return;
    }

    const existingProfile = await knex("EmployeeProfiles")
      .where({ user_id: userId })
      .first();
    if (existingProfile) {
      res.status(409).json({
        message: "Employee profile already exists for this user",
        employee: existingProfile,
      });
      return;
    }

    const [id] = await knex("EmployeeProfiles").insert({ ...value, user_id: userId });
    res.status(201).json(await knex("EmployeeProfiles").where({ id }).first());
  } catch (err) {
    if (isDuplicateEmployeeProfileError(err)) {
      res.status(409).json({
        message: "Employee profile already exists for this user",
      });
      return;
    }
    next(err);
  }
};

export const updateEmployeeProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = profileSchema.fork(["business_id"], (field) => field.optional()).min(1).validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const updated = await knex("EmployeeProfiles")
      .where({ id: Number(req.params.id) })
      .update({ ...value, updated_at: new Date() });
    if (!updated) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }
    res.status(200).json(await knex("EmployeeProfiles").where({ id: Number(req.params.id) }).first());
  } catch (err) {
    next(err);
  }
};

export const deleteEmployeeProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await knex("EmployeeProfiles").where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const assignServiceVariant = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = serviceVariantSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const record = {
      employee_id: Number(req.params.id),
      service_variant_id: value.service_variant_id,
    };
    const exists = await knex("EmployeeServiceVariants").where(record).first();
    if (!exists) await knex("EmployeeServiceVariants").insert(record);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

export const removeServiceVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await knex("EmployeeServiceVariants")
      .where({
        employee_id: Number(req.params.id),
        service_variant_id: Number(req.params.variantId),
      })
      .del();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
