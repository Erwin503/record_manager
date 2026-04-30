import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, errors } = format;

const stringifyMeta = (value: unknown) =>
  JSON.stringify(
    value,
    (_key, item) => {
      if (item instanceof Error) {
        return {
          name: item.name,
          message: item.message,
          stack: item.stack,
        };
      }
      return item;
    },
    2
  );

const logFormat = printf((info) => {
  const { level, message, timestamp, stack, ...meta } = info;
  const metaText = Object.keys(meta).length ? ` ${stringifyMeta(meta)}` : "";
  return `${timestamp} [${level}]: ${stack || message}${metaText}`;
});

const withBaseFormat = (...extraFormats: any[]) =>
  combine(
    ...extraFormats,
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  );

const logger = createLogger({
  level: "debug",
  format: withBaseFormat(),
  transports: [
    new transports.Console({
      format: withBaseFormat(format.colorize()),
    }),
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      format: withBaseFormat(),
    }),
    new transports.File({
      filename: "logs/combined.log",
      format: withBaseFormat(),
    }),
  ],
});

export default logger;
