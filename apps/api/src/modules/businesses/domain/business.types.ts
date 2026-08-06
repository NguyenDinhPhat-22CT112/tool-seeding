/**
 * Domain layer không phụ thuộc Prisma — để application/presentation không bị khoá cứng
 * vào ORM. PrismaBusinessRepository (infrastructure) chịu trách nhiệm map qua lại.
 *
 * Quy ước trạng thái:
 *   - `isActive = false` → doanh nghiệp đã bị **deactivate** (ngừng hoạt động).
 *     Vẫn xem được nhưng không tạo/bắt đầu session mới.
 *   - `deletedAt != null` → doanh nghiệp đã bị **soft-delete** (xóa mềm/lưu trữ).
 *     Dành cho thao tác xóa/lưu trữ riêng nếu sau này cần.
 *   - Hai trạng thái này TÁCH BIỆT hoàn toàn, không gộp chung.
 *
 * Quy ước dữ liệu cập nhật (UpdateBusinessData):
 *   - `undefined` → không cập nhật field (giữ nguyên giá trị cũ).
 *   - `null`      → xóa giá trị field nullable (set về null trong DB).
 *   - Giá trị cụ thể → cập nhật bình thường.
 *   - Array `[]`  → xóa hết phần tử (khác với `undefined` là không đụng).
 */

import type { Prisma } from "@seeding/database";
import type {
  AnalysisSessionStatus,
  BusinessLocationSource,
  CompetitorItem,
  NamedNote,
  PaginatedResponse,
  TargetAudienceItem,
} from "@seeding/contracts";

export type { CompetitorItem, NamedNote, TargetAudienceItem };

export interface BusinessEntity {
  id: string;
  organizationId: string;
  name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  products: NamedNote[];
  services: NamedNote[];
  targetAudience: TargetAudienceItem[];
  competitors: CompetitorItem[];
  strengths: string[];
  brandVoice: string | null;
  allowedTopics: string[];
  bannedTopics: string[];
  extraNotes: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BusinessLocationEntity {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  primaryType: string | null;
  rating: number | null;
  userRatingCount: number | null;
  source: BusinessLocationSource;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  serpapiPlaceId?: string | null;
}

export type CreateBusinessLocationData = Omit<
  BusinessLocationEntity,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateBusinessLocationData = Partial<
  Pick<
    BusinessLocationEntity,
    | "name"
    | "address"
    | "phone"
    | "website"
    | "isActive"
    | "source"
    | "serpapiPlaceId"
  >
>;

export interface BusinessWithLocation {
  business: BusinessEntity;
  location: BusinessLocationEntity;
}

/** Dữ liệu tạo mới — id/organizationId/createdBy/createdAt do use case điền, không nhận từ client. */
export type CreateBusinessData = Omit<
  BusinessEntity,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "isActive"
>;

/** Dữ liệu cập nhật — không bao giờ chứa id/organizationId/createdBy/createdAt (theo mục 2.3 tài liệu). */
export type UpdateBusinessData = Partial<
  Omit<
    BusinessEntity,
    | "id"
    | "organizationId"
    | "createdBy"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "isActive"
  >
>;

export interface ListBusinessesFilter {
  organizationId: string;
  search?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page: number;
  pageSize: number;
}

export type Paginated<T> = PaginatedResponse<T>;

export interface BusinessListRecord {
  business: BusinessEntity;
  sessionCount: number;
}

export interface BusinessRepository {
  create(data: CreateBusinessData): Promise<BusinessEntity>;

  findLocationBySerpApiPlaceIdInOrg(
    organizationId: string,
    placeId: string,
  ): Promise<BusinessLocationEntity | null>;

  /** Luôn scope theo organizationId — không có phương thức findById không kèm org. */
  findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<BusinessEntity | null>;

  update(
    id: string,
    organizationId: string,
    data: UpdateBusinessData,
  ): Promise<BusinessEntity | null>;

  list(filter: ListBusinessesFilter): Promise<Paginated<BusinessListRecord>>;

  findByIdWithLock(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessEntity | null>;

  archiveDraftSessions(
    businessId: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  countSessionsNotInStatuses(
    businessId: string,
    organizationId: string,
    statuses: AnalysisSessionStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<number>;

  updateIsActive(
    id: string,
    organizationId: string,
    isActive: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessEntity | null>;

  /** Xóa vĩnh viễn doanh nghiệp + cascade sạch toàn bộ dữ liệu con (session, insight, feedback, ...). */
  hardDelete(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  createWithLocation(
    business: CreateBusinessData,
    location: Omit<CreateBusinessLocationData, "businessId">,
  ): Promise<BusinessWithLocation | null>;

  createLocation(
    data: CreateBusinessLocationData,
  ): Promise<BusinessLocationEntity | null>;

  /** Xóa mềm địa điểm — set isActive=false (giống deactivate business). */
  deleteLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity | null>;

  listLocations(
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity[]>;

  findLocation(
    id: string,
    businessId: string,
    organizationId: string,
  ): Promise<BusinessLocationEntity | null>;

  updateLocation(
    id: string,
    businessId: string,
    organizationId: string,
    data: UpdateBusinessLocationData,
  ): Promise<BusinessLocationEntity | null>;
}

export const BUSINESS_REPOSITORY = Symbol("BUSINESS_REPOSITORY");
