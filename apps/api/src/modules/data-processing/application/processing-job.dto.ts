import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type { JobStatus, JobType } from "../domain/processing-job.types";

const JOB_STATUSES: JobStatus[] = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const JOB_TYPES: JobType[] = [
  "DATA_NORMALIZATION",
  "DEDUPLICATION",
  "AI_FEEDBACK_ANALYSIS",
  "REVIEW_CRAWLING",
  "INSIGHT_GENERATION",
  "STRATEGY_GENERATION",
];

export class ListProcessingJobsQueryDto {
  @ApiPropertyOptional({ description: "Lọc theo analysis session" })
  @IsOptional()
  analysisSessionId?: string;

  @ApiPropertyOptional({ enum: JOB_STATUSES })
  @IsOptional()
  @IsIn(JOB_STATUSES)
  status?: JobStatus;

  @ApiPropertyOptional({ enum: JOB_TYPES })
  @IsOptional()
  @IsIn(JOB_TYPES)
  jobType?: JobType;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
