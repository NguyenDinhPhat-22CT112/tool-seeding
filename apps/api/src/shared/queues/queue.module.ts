import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from "./queue.constants";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("redis.host", "localhost"),
          port: config.get("redis.port", 6379),
          password: config.get("redis.password") || undefined,
        },
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.DATA_PROCESSING }
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
