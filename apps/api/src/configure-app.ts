import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./common";

/** Cấu hình HTTP dùng chung cho runtime và E2E để test đúng hành vi production. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
