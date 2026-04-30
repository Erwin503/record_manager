import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import knex from "../db/knex";

const categorySchema = Joi.object({
  business_id: Joi.number().integer().required(),
  name: Joi.string().min(1).required(),
  description: Joi.string().allow(null, "").optional(),
});

const serviceSchema = Joi.object({
  business_id: Joi.number().integer().required(),
  category_id: Joi.number().integer().allow(null).optional(),
  name: Joi.string().min(1).required(),
  description: Joi.string().allow(null, "").optional(),
  is_active: Joi.boolean().default(true),
});

const variantSchema = Joi.object({
  service_id: Joi.number().integer().required(),
  name: Joi.string().min(1).required(),
  duration_minutes: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).default(0),
  currency: Joi.string().length(3).default("RUB"),
  rebook_reminder_days: Joi.number().integer().min(1).allow(null).optional(),
  is_active: Joi.boolean().default(true),
});

const validate = (schema: Joi.ObjectSchema, body: unknown) =>
  schema.validate(body, { abortEarly: false, stripUnknown: true });

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("ServiceCategories").orderBy("name", "asc");
    if (req.query.business_id) query.where({ business_id: Number(req.query.business_id) });
    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validate(categorySchema, req.body);
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const [id] = await knex("ServiceCategories").insert(value);
    res.status(201).json(await knex("ServiceCategories").where({ id }).first());
  } catch (err) {
    next(err);
  }
};

export const getServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("Services").orderBy("name", "asc");
    if (req.query.business_id) query.where({ business_id: Number(req.query.business_id) });
    if (req.query.category_id) query.where({ category_id: Number(req.query.category_id) });
    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const getServiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await knex("Services").where({ id: Number(req.params.id) }).first();
    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    const variants = await knex("ServiceVariants").where({ service_id: service.id }).orderBy("price", "asc");
    res.status(200).json({ ...service, variants });
  } catch (err) {
    next(err);
  }
};

export const createService = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validate(serviceSchema, req.body);
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const [id] = await knex("Services").insert(value);
    res.status(201).json(await knex("Services").where({ id }).first());
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validate(serviceSchema.fork(["business_id", "name"], (field) => field.optional()).min(1), req.body);
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const updated = await knex("Services").where({ id: Number(req.params.id) }).update({ ...value, updated_at: new Date() });
    if (!updated) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    res.status(200).json(await knex("Services").where({ id: Number(req.params.id) }).first());
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await knex("Services").where({ id: Number(req.params.id) }).del();
    if (!deleted) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getServiceVariants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = knex("ServiceVariants").orderBy("duration_minutes", "asc");
    if (req.query.service_id) query.where({ service_id: Number(req.query.service_id) });
    res.status(200).json(await query);
  } catch (err) {
    next(err);
  }
};

export const createServiceVariant = async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validate(variantSchema, req.body);
  if (error) {
    res.status(400).json({ message: "Invalid payload", details: error.details.map((d) => d.message) });
    return;
  }
  try {
    const [id] = await knex("ServiceVariants").insert(value);
    res.status(201).json(await knex("ServiceVariants").where({ id }).first());
  } catch (err) {
    next(err);
  }
};
