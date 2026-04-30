// Импорт необходимых модулей
import express from "express";
import dotenv from "dotenv";
import apiRoutes from "./routes/index"; // Подключение маршрутов пользователя
import { logRequests } from "./middleware/logger"; // Middleware для логирования
import { errorHandler } from "./middleware/errorHandler"; // Middleware для обработки ошибок
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { startAppointmentReminderScheduler } from "./utils/appointmentReminderService";

dotenv.config(); // Загрузка переменных окружения из .env

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*", // Укажите адрес вашего клиента
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Разрешённые HTTP-методы
    credentials: true, // Если требуется отправка cookie
  })
);

// Middleware для обработки JSON
app.use(express.json());

// Middleware для логирования запросов
app.use(logRequests);

// Swagger UI
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

startAppointmentReminderScheduler();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Подключение маршрутов
app.use("/api", apiRoutes);

// Обработчик ошибок (должен быть последним middleware)
app.use(errorHandler);

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
