/**
 * Structured Logger for WhatsApp Business Assistant
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

class Logger {
  private format(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(err instanceof Error ? { error: err.stack || err.message } : err ? { error: String(err) } : {})
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, context || '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context) : '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context) : '');
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, {
      ...(context || {}),
      error: err instanceof Error ? err.stack : err
    });
  }
}

export const logger = new Logger();
