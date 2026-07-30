import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { SerpApiGatewayService } from "../../../integrations/serpapi";
import { BUSINESS_REPOSITORY, type BusinessRepository } from "../domain/business.types";
import { BusinessPolicy } from "./business.policy";
import type { RequestContext } from "../../../shared/context/request-context";
import { type SerpApiPreviewResponse, type SerpApiAutocompleteResponse, CreateBusinessFromSerpApiResponse } from "./business-location.mapper";
import { CreateBusinessFromSerpApiDto, AddBusinessLocationFromSerpApiDto } from "./serpapi.dto";
import type { BusinessLocationEntity, BusinessEntity } from "../domain/business.types";

@Injectable()
export class BusinessSerpApiService {
    constructor(
        @Inject(BUSINESS_REPOSITORY)
        private readonly repo: BusinessRepository,
        private readonly policy: BusinessPolicy,
        private readonly serpapi: SerpApiGatewayService,
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
        this.policy.assertCanCreate(ctx);
        const preview = await this.preview(ctx, dto.placeId, dto.sessionToken);

        const existing = await this.repo.findLocationBySerpApiPlaceIdInOrg(ctx.organizationId, preview.placeId);
        if (existing) {
            throw new ConflictException("Doanh nghiệp từ SerpAPI này đã được import vào hệ thống.");
        }

        const business = await this.repo.create({
            organizationId: ctx.organizationId,
            name: preview.displayName,
            address: preview.formattedAddress,
            phone: preview.nationalPhoneNumber,
            email: null,
            website: preview.websiteUri,
            industry: preview.primaryType ?? null,
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

        let location: BusinessLocationEntity | undefined;
        if (dto.includeLocation !== false) {
            const loc = await this.repo.createLocation({
                organizationId: ctx.organizationId,
                businessId: business.id,
                name: preview.displayName,
                address: preview.formattedAddress,
                phone: preview.nationalPhoneNumber,
                website: preview.websiteUri,
                primaryType: preview.primaryType ?? null,
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

        const preview = await this.preview(ctx, dto.placeId, dto.sessionToken);

        const existing = await this.repo.findLocationBySerpApiPlaceIdInOrg(ctx.organizationId, preview.placeId);
        if (existing) {
            throw new ConflictException("Địa điểm này đã được liên kết với một doanh nghiệp khác trong tổ chức.");
        }

        return this.repo.createLocation({
            organizationId: ctx.organizationId,
            businessId: business.id,
            name: preview.displayName,
            address: preview.formattedAddress,
            phone: preview.nationalPhoneNumber,
            website: preview.websiteUri,
            primaryType: preview.primaryType ?? null,
            serpapiPlaceId: preview.placeId,
            rating: preview.rating ?? null,
            userRatingCount: preview.userRatingCount ?? null,
            source: "SERPAPI",
            isActive: true,
        });
    }
}
