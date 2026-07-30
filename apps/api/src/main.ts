import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Seeding Strategy Tool API")
    .setDescription("API cho module Phân tích và Xây dựng chiến lược Seeding")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
