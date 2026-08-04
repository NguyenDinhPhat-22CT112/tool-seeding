import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { globalFileLogger } from "./common/file-logger";

async function bootstrap(): Promise<void> {
  await globalFileLogger.initialize();
  await globalFileLogger.log("INFO", "Worker application starting...");

  try {
    const app = await NestFactory.createApplicationContext(WorkerModule);
    await globalFileLogger.log("INFO", "Worker application started successfully");

    // Log when application is shutting down
    app.enableShutdownHooks();
    process.on("SIGINT", async () => {
      await globalFileLogger.log("INFO", "Received SIGINT, shutting down...");
      await app.close();
      await globalFileLogger.log("INFO", "Worker application closed");
      await globalFileLogger.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await globalFileLogger.log("INFO", "Received SIGTERM, shutting down...");
      await app.close();
      await globalFileLogger.log("INFO", "Worker application closed");
      await globalFileLogger.close();
      process.exit(0);
    });
  } catch (error) {
    await globalFileLogger.log("ERROR", "Failed to start worker application", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    await globalFileLogger.close();
    throw error;
  }
}

void bootstrap();
