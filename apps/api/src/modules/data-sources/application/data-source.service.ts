import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import { AnalysisSessionStateMachine } from "../../analysis-sessions/domain/analysis-session-state-machine";
import {
  ANALYSIS_SESSION_REPOSITORY,
  AnalysisSessionRepository,
} from "../../analysis-sessions/domain/analysis-session.types";
import {
  CreateDataSourceData,
  DATA_SOURCE_REPOSITORY,
  DataSourceRepository,
} from "../domain/data-source.types";
import { CreateDataSourceDto } from "./data-source.dto";
import { DataSourceMapper } from "./data-source.mapper";
import { DataSourcePolicy } from "./data-source.policy";

@Injectable()
export class DataSourceService {
  constructor(
    @Inject(DATA_SOURCE_REPOSITORY) private readonly repo: DataSourceRepository,
    @Inject(ANALYSIS_SESSION_REPOSITORY)
    private readonly sessionRepo: AnalysisSessionRepository,
    private readonly policy: DataSourcePolicy,
  ) {}

  async list(ctx: RequestContext, sessionId: string) {
    await this.assertSessionAllowsData(ctx, sessionId);
    const items = await this.repo.listBySession(sessionId, ctx.organizationId);
    return items.map(DataSourceMapper.toResponse);
  }

  async create(ctx: RequestContext, sessionId: string, dto: CreateDataSourceDto) {
    this.policy.assertCanCreate(ctx);
    const session = await this.assertSessionAllowsData(ctx, sessionId);

    const data: CreateDataSourceData = {
      analysisSessionId: sessionId,
      businessId: session.businessId,
      businessLocationId: dto.businessLocationId ?? null,
      name: dto.name,
      sourceType: dto.sourceType,
      createdBy: ctx.userId,
    };

    const created = await this.repo.create(data);
    return DataSourceMapper.toResponse(created);
  }

  private async assertSessionAllowsData(ctx: RequestContext, sessionId: string) {
    const session = await this.sessionRepo.findByIdInOrg(sessionId, ctx.organizationId);
    if (!session) {
      throw new DomainError("SESSION_NOT_FOUND");
    }
    if (session.status !== "DATA_COLLECTION") {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    if (!AnalysisSessionStateMachine.acceptsNewData(session.status)) {
      throw new DomainError("SESSION_WRONG_STATE");
    }
    return session;
  }
}
