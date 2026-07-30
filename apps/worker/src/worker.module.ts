import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get("REDIS_PORT", 6379),
          password: config.get("REDIS_PASSWORD") || undefined,
        },
      }),
    }),
    // Đăng ký queue processors theo từng business module tại đây.
  ],
})
export class WorkerModule {}
