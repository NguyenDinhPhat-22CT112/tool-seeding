export interface HealthResponse {
  service: "api" | "worker";
  status: "ok" | "degraded";
  timestamp: string;
}

export type OrgRole =
  | "ORG_ADMIN"
  | "ANALYST"
  | "INSIGHT_REVIEWER"
  | "STRATEGY_MANAGER"
  | "VIEWER";

export interface ApiErrorResponse {
  statusCode: number;
  code?: string;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

/** Mã lỗi domain — frontend match theo field `code` trong ApiErrorResponse. */
export type ErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_WRONG_STATE"
  | "SESSION_CONCURRENT"
  | "BUSINESS_NOT_FOUND"
  | "BUSINESS_INACTIVE"
  | "DATA_SOURCE_NOT_FOUND"
  | "FEEDBACK_NOT_FOUND"
  | "FEEDBACK_CONTENT_EMPTY"
  | "FEEDBACK_INVALID_RATING"
  | "FEEDBACK_IMMUTABLE"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_FILE_TOO_LARGE"
  | "IMPORT_UNSUPPORTED_TYPE"
  | "IMPORT_PARSE_ERROR"
  | "IMPORT_CONTENT_COL_REQUIRED"
  | "IMPORT_WRONG_STATE"
  | "IMPORT_ALL_ROWS_INVALID"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_PROVIDER_RATE_LIMIT"
  | "AI_OUTPUT_INVALID"
  | "AI_ANALYSIS_NOT_FOUND"
  | "JOB_NOT_FOUND"
  | "JOB_ALREADY_RUNNING"
  | "JOB_CANNOT_RETRY"
  | "JOB_CANNOT_CANCEL"
  | "INSIGHT_NOT_FOUND"
  | "INSIGHT_WRONG_STATE"
  | "INSIGHT_REJECT_NEEDS_COMMENT"
  | "INSIGHT_MERGE_MIN_TWO"
  | "INSIGHT_MERGE_DIFF_SESSION"
  | "INSIGHT_SPLIT_NEEDS_EVIDENCE"
  | "STRATEGY_NOT_FOUND"
  | "STRATEGY_VERSION_NOT_FOUND"
  | "STRATEGY_WRONG_STATE"
  | "STRATEGY_NO_APPROVED_INSIGHTS"
  | "STRATEGY_LOCKED_IMMUTABLE"
  | "STRATEGY_REVISION_NEEDS_COMMENT"
  | "FORBIDDEN";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NamedNote {
  name: string;
  description?: string;
}

export interface TargetAudienceItem {
  segment: string;
  characteristics?: string;
}

export interface CompetitorItem {
  name: string;
  notes?: string;
}

export interface BusinessProfile {
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
}

export interface CreateBusinessRequest extends Partial<Omit<BusinessProfile, "name">> {
  name: string;
}

export type UpdateBusinessRequest = Partial<BusinessProfile>;

export interface ListBusinessesQuery {
  search?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface BusinessListItemResponse {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  isActive: boolean;
  sessionCount: number;
  updatedAt: string;
}

export interface BusinessDetailResponse extends BusinessProfile {
  id: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BusinessListResponse = PaginatedResponse<BusinessListItemResponse>;

export interface DeactivateBusinessResponse extends BusinessDetailResponse {
  archivedDraftCount: number;
}



export type BusinessLocationSource = "MANUAL" | "SERPAPI";
export type SerpApiLinkStatus = "LINKED" | "DISCONNECTED";
export type SerpApiBusinessStatus = "UNKNOWN" | "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";

export interface BusinessLocationResponse {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  primaryType: string | null;
  serpapiPlaceId?: string | null;
  serpapiLocationId?: string | null;
  serpapiPlaceLinkStatus?: SerpApiLinkStatus | null;
  mapsUrl?: string | null;
  rating: number | null;
  userRatingCount: number | null;
  source: BusinessLocationSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SerpApiPrediction {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
}

export interface SerpApiPreview {
  provider: "SERPAPI";
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
  types: string[];
  primaryType: string | null;
  businessStatus: SerpApiBusinessStatus;
  mapsUrl: string | null;
  nationalPhoneNumber: string | null;
  websiteUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
}

export interface SerpApiUsageItem {
  used: number;
  limit: number;
  warning: boolean;
  exhausted: boolean;
}

export interface SerpApiStatusResponse {
  enabled: boolean;
  configured: boolean;
  autocomplete?: SerpApiUsageItem;
  placeDetails?: SerpApiUsageItem;
}

export interface SerpApiAutocompleteRequest {
  input: string;
  sessionToken: string;
}

export interface SerpApiAutocompleteResponse {
  predictions: SerpApiPrediction[];
  sessionToken: string;
}

export interface SerpApiPreviewRequest {
  placeId: string;
  sessionToken?: string;
}

export interface CreateBusinessFromSerpApiRequest {
  placeId: string;
  sessionToken?: string;
  includeLocation?: boolean;
}

export interface CreateBusinessFromSerpApiResponse {
  business: BusinessDetailResponse;
  location?: BusinessLocationResponse;
}

export interface AddBusinessLocationFromSerpApiRequest {
  placeId: string;
  sessionToken?: string;
}



export interface UpdateBusinessLocationRequest {
  name?: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface CreateBusinessLocationRequest {
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
}



export type AnalysisSessionStatus =
  | "DRAFT"
  | "DATA_COLLECTION"
  | "PROCESSING"
  | "ANALYZING"
  | "INSIGHT_REVIEW"
  | "STRATEGY_BUILDING"
  | "COMPLETED"
  | "ARCHIVED";

export interface BusinessProfileSnapshot extends BusinessProfile {
  id: string;
  sourceUpdatedAt: string;
}

export interface CreateAnalysisSessionRequest {
  businessId: string;
  name: string;
  objective?: string | null;
  focusProduct?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface UpdateAnalysisSessionRequest {
  name?: string;
  objective?: string | null;
  focusProduct?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface ListAnalysisSessionsQuery {
  businessId?: string;
  status?: AnalysisSessionStatus;
  createdFrom?: string;
  createdTo?: string;
  keyword?: string;
  createdBy?: string;
  page?: number;
  pageSize?: number;
}

export interface AnalysisSessionProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
}

export interface AnalysisSessionNextAction {
  code: string;
  label: string;
}

export interface AnalysisSessionListItemResponse {
  id: string;
  name: string;
  businessId: string;
  objective: string | null;
  status: AnalysisSessionStatus;
  feedbackCount: number;
  updatedAt: string;
}

export interface AnalysisSessionDetailResponse {
  id: string;
  organizationId: string;
  businessId: string;
  name: string;
  objective: string | null;
  focusProduct: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  businessSnapshot: BusinessProfileSnapshot | null;
  businessSnapshotAt: string | null;
  status: AnalysisSessionStatus;
  progress: AnalysisSessionProgress;
  nextAction: AnalysisSessionNextAction | null;
  feedbackCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

export type AnalysisSessionListResponse =
  PaginatedResponse<AnalysisSessionListItemResponse>;

// ── Data Source ──

export type SourceType = "MANUAL" | "EXCEL" | "CSV";

export type DataSourceStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface CreateDataSourceRequest {
  name: string;
  sourceType: SourceType;
  businessLocationId?: string | null;
}

export interface DataSourceResponse {
  id: string;
  analysisSessionId: string;
  businessId: string;
  businessLocationId: string | null;
  name: string;
  sourceType: SourceType;
  status: DataSourceStatus;
  totalRecords: number | null;
  validRecords: number | null;
  errorRecords: number | null;
  createdAt: string;
  updatedAt: string;
}

// ── Feedback ──

export type FeedbackProcessingStatus =
  | "RAW"
  | "NORMALIZED"
  | "DUPLICATE"
  | "EXCLUDED";

export interface CreateFeedbackRequest {
  rawContent: string;
  rating?: number | null;
  reviewerName?: string | null;
  language?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  notes?: string | null;
}

export interface UpdateFeedbackRequest {
  rating?: number | null;
  notes?: string | null;
}

export interface ListFeedbackQuery {
  processingStatus?: FeedbackProcessingStatus;
  page?: number;
  pageSize?: number;
}

export interface FeedbackResponse {
  id: string;
  analysisSessionId: string;
  dataSourceId: string;
  externalId: string | null;
  contentHash: string | null;
  rawContent: string;
  normalizedContent: string | null;
  reviewerName: string | null;
  rating: number | null;
  language: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  notes: string | null;
  processingStatus: FeedbackProcessingStatus;
  duplicateOfId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListItemResponse {
  id: string;
  rawContent: string;
  rating: number | null;
  reviewerName: string | null;
  processingStatus: FeedbackProcessingStatus;
  createdAt: string;
}

export type FeedbackListResponse = PaginatedResponse<FeedbackListItemResponse>;

// ── Import ──

export type ImportBatchStatus =
  | "UPLOADING"
  | "MAPPING"
  | "VALIDATING"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED";

export interface ImportBatchResponse {
  id: string;
  dataSourceId: string;
  fileName: string;
  fileSize: number;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  columnMapping: Record<string, string> | null;
  headers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MapImportColumnsRequest {
  columnMapping: Record<string, string>;
}

export interface ImportPreviewResponse {
  rows: Record<string, string>[];
  totalPreviewRows: number;
}
