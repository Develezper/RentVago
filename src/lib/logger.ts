type LogLevel = "info" | "warn" | "error";

const baseContext = {
  service: "rentvago-api",
};

const writeLog = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...baseContext,
    ...(meta ? { meta } : {}),
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog("error", message, meta),
};
