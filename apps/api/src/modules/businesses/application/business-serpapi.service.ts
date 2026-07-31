import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { SerpApiGatewayService } from "../../../integrations/serpapi";
import { BUSINESS_REPOSITORY, type BusinessRepository } from "../domain/business.types";
import { BusinessPolicy } from "./business.policy";
import type { RequestContext } from "../../../shared/context/request-context";
import { type SerpApiPreviewResponse, type SerpApiAutocompleteResponse } from "./business-location.mapper";
import { CreateBusinessFromSerpApiDto, AddBusinessLocationFromSerpApiDto } from "./serpapi.dto";
import type { BusinessLocationEntity, BusinessEntity } from "../domain/business.types";
import { BusinessService } from "./business.service";
import { BusinessMapper } from "./business.mapper";

@Injectable()
export class BusinessSerpApiService {
    constructor(
        @Inject(BUSINESS_REPOSITORY)
        private readonly repo: BusinessRepository,
        private readonly policy: BusinessPolicy,
        private readonly serpapi: SerpApiGatewayService,
        private readonly businessService: BusinessService,
    ) {}

    async status(ctx: RequestContext) {
        return this.serpapi.getStatus(ctx.organizationId);
    }

    async autocomplete(
        ctx: RequestContext,
        input: string,
        sessionToken: string,
    ): Promise<SerpApiAutocompleteResponse> {
        const predictions = await this.serpapi.autocomplete(
            ctx.organizationId,
            input,
            sessionToken,
        );
        return {
            predictions,
            sessionToken,
        };
    }

    async preview(
        ctx: RequestContext,
        placeId: string,
        sessionToken?: string,
    ): Promise<SerpApiPreviewResponse> {
        return this.serpapi.getPreview(ctx.organizationId, placeId, sessionToken);
    }

    async createBusiness(ctx: RequestContext, dto: CreateBusinessFromSerpApiDto) {
        const existing = await this.repo.findLocationBySerpApiPlaceIdInOrg(ctx.organizationId, dto.placeId);
        if (existing) {
            const business = await this.repo.findByIdInOrg(existing.businessId, ctx.organizationId);
            if (business) {
                throw new ConflictException("Doanh nghiệp từ SerpAPI này đã được import vào hệ thống.");
            }
            await this.repo.updateLocation(existing.id, existing.businessId, ctx.organizationId, {
                serpapiPlaceId: null,
            });
        }

        const hasAllFields = !!(dto.name && dto.address && dto.phone && dto.website && dto.industry);
        const needPreview = !hasAllFields || dto.includeLocation !== false;

        let preview: SerpApiPreviewResponse | undefined;
        if (needPreview) {
            preview = await this.preview(ctx, dto.placeId, dto.sessionToken);
        }

        const entity = await this.businessService.createEntity(ctx, {
            organizationId: ctx.organizationId,
            name: dto.name ?? preview?.displayName ?? "Unknown",
            address: dto.address ?? preview?.formattedAddress ?? null,
            phone: dto.phone ?? preview?.nationalPhoneNumber ?? null,
            email: null,
            website: dto.website ?? preview?.websiteUri ?? null,
            industry: dto.industry ?? preview?.primaryType ?? null,
            description: null,
            products: [],
            services: [],
            targetAudience: [],
            competitors: [],
            strengths: [],
            brandVoice: null,
            allowedTopics: [],
            bannedTopics: [],
            extraNotes: null,
            createdBy: ctx.userId ?? "SYSTEM",
        });

        const business = BusinessMapper.toDetail(entity);

        let location: BusinessLocationEntity | undefined;
        if (dto.includeLocation !== false) {
            if (!preview) {
                preview = await this.preview(ctx, dto.placeId, dto.sessionToken);
            }
            const loc = await this.repo.createLocation({
                organizationId: ctx.organizationId,
                businessId: entity.id,
                name: dto.name ?? preview.displayName,
                address: dto.address ?? preview.formattedAddress,
                phone: dto.phone ?? preview.nationalPhoneNumber,
                website: dto.website ?? preview.websiteUri,
                primaryType: dto.industry ?? preview.primaryType ?? null,
                serpapiPlaceId: preview.placeId,
                rating: preview.rating ?? null,
                userRatingCount: preview.userRatingCount ?? null,
                source: "SERPAPI",
                isActive: true,
            });
            if (loc) {
                location = loc;
            }
        }

        return { business, location };
    }

    async addLocation(ctx: RequestContext, businessId: string, dto: AddBusinessLocationFromSerpApiDto) {
        const business = await this.repo.findByIdInOrg(businessId, ctx.organizationId);
        if (!business) {
            throw new NotFoundException("Business not found");
        }
        this.policy.assertCanUpdate(ctx);

        const existing = await this.repo.findLocationBySerpApiPlaceIdInOrg(ctx.organizationId, dto.placeId);
        if (existing) {
            const activeBusiness = await this.repo.findByIdInOrg(existing.businessId, ctx.organizationId);
            if (activeBusiness) {
                throw new ConflictException("Địa điểm này đã được liên kết với một doanh nghiệp khác trong tổ chức.");
            }
            await this.repo.updateLocation(existing.id, existing.businessId, ctx.organizationId, {
                serpapiPlaceId: null,
            });
        }

        const hasAllFields = !!(dto.name && dto.address && dto.phone && dto.website);
        let preview: SerpApiPreviewResponse | undefined;
        if (!hasAllFields) {
            preview = await this.preview(ctx, dto.placeId, dto.sessionToken);
        }

        return this.repo.createLocation({
            organizationId: ctx.organizationId,
            businessId,
            name: dto.name ?? preview?.displayName ?? "Unknown",
            address: dto.address ?? preview?.formattedAddress ?? null,
            phone: dto.phone ?? preview?.nationalPhoneNumber ?? null,
            website: dto.website ?? preview?.websiteUri ?? null,
            primaryType: preview?.primaryType ?? null,
            serpapiPlaceId: dto.placeId,
            rating: preview?.rating ?? null,
            userRatingCount: preview?.userRatingCount ?? null,
            source: "SERPAPI",
            isActive: true,
        });
    }
}
