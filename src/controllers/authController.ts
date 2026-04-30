import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import knex from "../db/knex";
import { AppError } from "../errors/AppError";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../utils/logger";
import Joi from "joi";

// Константы
const USERS_TABLE = "Users";
const isDev = process.env.NODE_ENV === "development";
const logDebug = (msg: string, meta?: any) => {
  if (isDev) logger.debug(msg, meta);
};

// Схемы валидации
const signupSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional(),
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
}).min(1);

// Регистрация
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = signupSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => d.message);
    res.status(400).json({ message: "Invalid payload", details });
    return;
  }
  try {
    const { name, email, password, phone } = value;
    logDebug("Signup attempt", { name, email });

    const exists = await knex(USERS_TABLE).where({ email }).first();
    if (exists) throw new AppError("Email already in use", 400);

    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await knex(USERS_TABLE)
      .insert({ name, email, password_hash, phone, role: "client" })
      .returning(["id", "name", "email", "phone", "role"]);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    res.status(201).json({ message: "Registered", token });
  } catch (err) {
    next(err);
  }
};

// Авторизация
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = loginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => d.message);
    res.status(400).json({ message: "Invalid payload", details });
    return;
  }
  try {
    const { email, password } = value;
    logDebug("Login attempt", { email });

    const user = await knex(USERS_TABLE).where({ email }).first();
    if (!user) throw new AppError("Invalid email or password", 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    res.status(200).json({
      message: "Authenticated",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Выход (JWT статeless, удалите токен на клиенте)
export const logout = (req: AuthRequest, res: Response) => {
  // На сервере JWT не хранятся, поэтому просто отвечаем успехом
  res.status(200).json({ message: "Logged out successfully" });
};

// Профиль пользователя
export const getUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.id;
    logDebug("Get profile", { userId });

    const user = await knex(USERS_TABLE).where({ id: userId }).first();
    if (!user) throw new AppError("User not found", 404);

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// Обновление профиля
export const updateUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = updateProfileSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => d.message);
    res.status(400).json({ message: "Invalid payload", details });
    return;
  }
  try {
    const userId = req.user.id;
    logDebug("Update profile", { userId, ...value });

    await knex(USERS_TABLE)
      .where({ id: userId })
      .update({ ...value, updated_at: new Date() });

    res.status(200).json({ message: "Profile updated" });
  } catch (err) {
    next(err);
  }
};

// Удаление собственного аккаунта
export const deleteUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.id;
    logDebug("Delete user", { userId });

    await knex(USERS_TABLE).where({ id: userId }).del();

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};
