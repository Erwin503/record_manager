import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";
import { AuthRequest } from "../middleware/authMiddleware";

const businessSchema = Joi.object({
  owner_id: Joi.number().integer().optional(),
  name: Joi.string().min(1).required(),
  description: Joi.string().allow(null, "").optional(),
  business_type: Joi.string()
    .valid("tire_service", "beauty_salon", "barbershop", "spa", "repair_service", "other")
    .default("other"),
  phone: Joi.string().allow(null, "").optional(),
  email: Joi.string().email().allow(null, "").optional(),
  website: Joi.string().allow(null, "").optional(),
  status: Joi.string().valid("active", "inactive", "suspended").default("active"),
});

const updateBusinessSchema = businessSchema.fork(["name"], (field) => field.optional()).min(1);

export const getBusinesses = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const businesses = await knex("Businesses").orderBy("name", "asc");
    res.status(200).json(businesses);
  } catch (err) {
    next(err);
  }
};

export const getBusinessById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const business = await knex("Businesses").where({ id: Number(req.params.id) }).first();
    if (!business) {
      res.status(404).json({ message: "Business not found" });
      return;
    }
    res.status(200).json(business);
  } catch (err) {
    next(err);
  }
};

export const createBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = businessSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const ownerId = req.user.role === "super_admin" && value.owner_id ? value.owner_id : req.user.id;
    const [id] = await knex("Businesses").insert({ ...value, owner_id: ownerId });
    const business = await knex("Businesses").where({ id }).first();
    res.status(201).json(business);
  } catch (err) {
    next(err);
  }
};

export const updateBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { error, value } = updateBusinessSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }

  try {
    const updated = await knex("Businesses")
      .where({ id: Number(req.params.id) })
      .update({ ...value, updated_at: new Date() });
    if (!updated) {
      res.status(404).json({ message: "Business not found" });
      return;
    }
    const business = await knex("Businesses").where({ id: Number(req.params.id) }).first();
    res.status(200).json(business);
  } catch (err) {
    next(err);
  }
};

export const deleteBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await knex("Businesses").where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "Business not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
