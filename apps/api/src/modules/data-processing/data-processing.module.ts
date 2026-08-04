import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { PROCESSING_JOB_REPOSITORY } from "./domain/processing-job.types";
import { ProcessingJobPolicy } from "./application/processing-job.policy";
import { ProcessingJobService } from "./application/processing-job.service";
import { PrismaProcessingJobRepository } from "./infrastructure/prisma-processing-job.repository";
import { ProcessingQueuePublisher } from "./infrastructure/processing-queue.publisher";
import { DataProcessingController } from "./presentation/data-processing.controller";
import { ProcessingJobsController } from "./presentation/processing-jobs.controller";

@Module({
  imports: [AnalysisSessionsModule],
  controllers: [DataProcessingController, ProcessingJobsController],
  providers: [
    ProcessingJobService,
    ProcessingJobPolicy,
    ProcessingQueuePublisher,
    {
      provide: PROCESSING_JOB_REPOSITORY,
      useClass: PrismaProcessingJobRepository,
    },
  ],
  exports: [ProcessingJobService, PROCESSING_JOB_REPOSITORY, ProcessingQueuePublisher],
})
export class DataProcessingModule {}
