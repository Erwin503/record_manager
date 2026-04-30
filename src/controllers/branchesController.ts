import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";

const branchSchema = Joi.object({
  business_id: Joi.number().integer().required(),
  name: Joi.string().min(1).required(),
  address: Joi.string().min(1).required(),
  city: Joi.string().allow(null, "").optional(),
  latitude: Joi.number().allow(null).optional(),
  longitude: Joi.number().allow(null).optional(),
  phone: Joi.string().allow(null, "").optional(),
  timezone: Joi.string().default("Europe/Moscow"),
  is_main: Joi.boolean().default(false),
});

const updateBranchSchema = branchSchema.fork(["business_id", "name", "address"], (field) => field.optional()).min(1);

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("Branches").orderBy("is_main", "desc").orderBy("name", "asc");
    if (req.query.business_id) query.where({ business_id: Number(req.query.business_id) });
    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getBranchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await knex("Branches").where({ id: Number(req.params.id) }).first();
    if (!branch) {
      res.status(404).json({ message: "Branch not found" });
      return;
    }
    res.status(200).json(branch);
  } catch (err) {
    next(err);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = branchSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const [id] = await knex("Branches").insert(value);
    res.status(201).json(await knex("Branches").where({ id }).first());
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = updateBranchSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const updated = await knex("Branches").where({ id: Number(req.params.id) }).update({ ...value, updated_at: new Date() });
    if (!updated) {
      res.status(404).json({ message: "Branch not found" });
      return;
    }
    res.status(200).json(await knex("Branches").where({ id: Number(req.params.id) }).first());
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await knex("Branches").where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "Branch not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
