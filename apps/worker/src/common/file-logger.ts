import { createWriteStream, WriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export class FileLogger {
    private stream: WriteStream | null = null;
    private logFilePath: string;

    constructor(logDir: string = "./logs") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.logFilePath = join(logDir, `worker-${timestamp}.log`);
    }

    async initialize(): Promise<void> {
        try {
            await mkdir(dirname(this.logFilePath), { recursive: true });
            this.stream = createWriteStream(this.logFilePath, { flags: "a" });
            await this.log("INFO", "FileLogger initialized", { logFile: this.logFilePath });
        } catch (error) {
            console.error("Failed to initialize FileLogger:", error);
        }
    }

    async log(level: string, message: string, context?: Record<string, unknown>): Promise<void> {
        if (!this.stream) return;

        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : "";
        const logLine = `[${timestamp}] [${level}] ${message}${contextStr}\n`;

        this.stream.write(logLine);
    }

    async close(): Promise<void> {
        if (this.stream) {
            await new Promise<void>((resolve) => {
                this.stream!.end(() => resolve());
            });
        }
    }
}

// Global file logger instance
export const globalFileLogger = new FileLogger();
