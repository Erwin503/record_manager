import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import logger from "../utils/logger";

// Middleware для проверки ролей
export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Проверяем, что роль пользователя есть в списке разрешённых ролей
    const role = req.user?.role;

    if (role && allowedRoles.includes(role)) {
      next(); // Если роль совпадает, продолжаем выполнение
    } else {
      logger.debug(
        `Роль пользователя: ${role ?? "unknown"}, допустимые роли: ${allowedRoles}`
      );
      res.status(403).json({ message: "Доступ запрещён: недостаточно прав" });
    }
  };
};
