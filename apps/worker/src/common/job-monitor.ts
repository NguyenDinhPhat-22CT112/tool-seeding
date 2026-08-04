import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, QueueEvents } from "bullmq";
import { globalFileLogger } from "./file-logger";

@Injectable()
export class JobMonitor implements OnModuleInit {
    private readonly logger = new Logger(JobMonitor.name);
    private queueEvents: QueueEvents | null = null;

    constructor(
        @InjectQueue("data-processing")
        private readonly queue: Queue,
    ) { }

    async onModuleInit(): Promise<void> {
        await globalFileLogger.log("INFO", "JobMonitor initialized - setting up queue listeners");
        this.logger.log("JobMonitor initialized");

        // Create QueueEvents to listen to queue events
        const connection = await this.queue.client;
        this.queueEvents = new QueueEvents("data-processing", {
            connection: {
                host: connection.options?.host as string,
                port: connection.options?.port as number,
            },
        });

        // Monitor waiting jobs
        this.queueEvents.on("waiting", async ({ jobId }) => {
            await globalFileLogger.log("INFO", "Job waiting in queue", { jobId });
            this.logger.log(`Job waiting: ${jobId}`);
        });

        // Monitor active jobs
        this.queueEvents.on("active", async ({ jobId }) => {
            await globalFileLogger.log("INFO", "Job became active", { jobId });
            this.logger.log(`Job active: ${jobId}`);
        });

        // Monitor completed jobs
        this.queueEvents.on("completed", async ({ jobId, returnvalue }) => {
            await globalFileLogger.log("INFO", "Job completed", {
                jobId,
                returnvalue,
            });
            this.logger.log(`Job completed: ${jobId}`);
        });

        // Monitor failed jobs
        this.queueEvents.on("failed", async ({ jobId, failedReason }) => {
            await globalFileLogger.log("ERROR", "Job failed", {
                jobId,
                failedReason,
            });
            this.logger.error(`Job failed: ${jobId} - ${failedReason}`);
        });

        // Monitor stalled jobs
        this.queueEvents.on("stalled", async ({ jobId }) => {
            await globalFileLogger.log("WARN", "Job stalled", { jobId });
            this.logger.warn(`Job stalled: ${jobId}`);
        });

        // Monitor progress
        this.queueEvents.on("progress", async ({ jobId, data }) => {
            await globalFileLogger.log("INFO", "Job progress update", {
                jobId,
                progress: data,
            });
        });

        // Log current queue status
        const counts = await this.queue.getJobCounts();
        await globalFileLogger.log("INFO", "Queue status on startup", counts);
        this.logger.log(`Queue status: ${JSON.stringify(counts)}`);
    }
}
