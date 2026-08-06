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
  | "INSIGHT_CONTENT_EMPTY"
  | "INSIGHT_INVALID_PRIORITY"
  | "INSIGHT_INVALID_CONFIDENCE"
  | "INSIGHT_REJECT_NEEDS_COMMENT"
  | "INSIGHT_REANALYSIS_NEEDS_COMMENT"
  | "INSIGHT_MERGE_MIN_TWO"
  | "INSIGHT_MERGE_DIFF_SESSION"
  | "INSIGHT_SPLIT_MIN_TWO"
  | "INSIGHT_SPLIT_NEEDS_EVIDENCE"
  | "STRATEGY_NOT_FOUND"
  | "STRATEGY_VERSION_NOT_FOUND"
  | "STRATEGY_WRONG_STATE"
  | "STRATEGY_NO_APPROVED_INSIGHTS"
  | "STRATEGY_LOCKED_IMMUTABLE"
  | "STRATEGY_REVISION_NEEDS_COMMENT"
  | "DATA_SOURCE_IN_USE"
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

export interface SerpApiReview {
  reviewId: string;
  rating: number | null;
  text: string;
  reviewerName: string | null;
  publishedAt: string | null;
  likeCount: number | null;
}

export interface SerpApiReviewsPage {
  reviews: SerpApiReview[];
  nextToken: string | null;
  totalReviews: number | null;
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
  reviews?: SerpApiUsageItem;
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
  name?: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
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
  businessName: string;
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

export type SourceType = "MANUAL" | "EXCEL" | "CSV" | "SERPAPI";

export type DataSourceStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface CreateDataSourceRequest {
  name: string;
  sourceType: SourceType;
  businessLocationId?: string | null;
}

export interface UpdateDataSourceRequest {
  name?: string;
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

// ── Insight ──

export type InsightStatus =
  | "DRAFT"
  | "WAITING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REANALYSIS"
  | "ARCHIVED";

export type InsightOrigin = "OBSERVED" | "INFERRED" | "ASSUMED";

export type InsightReviewAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "EDITED"
  | "REANALYSIS_REQUESTED"
  | "MERGED"
  | "SPLIT"
  | "ARCHIVED";

export interface InsightEvidenceResponse {
  id: string;
  feedbackId: string;
  excerpt: string | null;
  relevance: number | null;
}

export interface InsightReviewLogResponse {
  id: string;
  action: InsightReviewAction;
  fromStatus: InsightStatus | null;
  toStatus: InsightStatus | null;
  actorId: string | null;
  comment: string | null;
  createdAt: string;
}

export interface CreateInsightRequest {
  title: string;
  description: string;
  origin?: InsightOrigin;
  priority?: number;
  confidence?: number;
  isFlagged?: boolean;
  evidenceFeedbackIds?: string[];
}

export interface UpdateInsightRequest {
  title?: string;
  description?: string;
  origin?: InsightOrigin;
  priority?: number;
  confidence?: number;
  isFlagged?: boolean;
}

export interface ReviewInsightRequest {
  comment?: string | null;
}

export interface MergeInsightsRequest {
  insightIds: string[];
  title: string;
  description: string;
}

export interface SplitInsightPart {
  title: string;
  description: string;
  evidenceFeedbackIds: string[];
}

export interface SplitInsightRequest {
  parts: SplitInsightPart[];
}

export interface ListInsightsQuery {
  status?: InsightStatus;
  origin?: InsightOrigin;
  isFlagged?: boolean;
  search?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

export interface InsightListItemResponse {
  id: string;
  title: string;
  description: string;
  priority: number;
  confidence: number;
  status: InsightStatus;
  origin: InsightOrigin;
  isFlagged: boolean;
  evidenceCount: number;
  updatedAt: string;
}

export type InsightListResponse = PaginatedResponse<InsightListItemResponse>;

export interface InsightResponse {
  id: string;
  analysisSessionId: string;
  title: string;
  description: string;
  origin: InsightOrigin;
  priority: number;
  confidence: number;
  frequencyCount: number;
  frequencyPct: number;
  status: InsightStatus;
  isFlagged: boolean;
  parentInsightId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  evidenceCount: number;
  evidences: InsightEvidenceResponse[];
  reviewLogs: InsightReviewLogResponse[];
}

// ── Strategy ──

export type StrategyVersionStatus =
  | "AI_DRAFT"
  | "DRAFT"
  | "WAITING_APPROVAL"
  | "NEEDS_REVISION"
  | "APPROVED"
  | "LOCKED"
  | "SUPERSEDED"
  | "ARCHIVED";

export interface StrategyTargetSegment {
  segment: string;
  description: string;
}

export interface StrategyContentTheme {
  theme: string;
  description: string;
  examples?: string;
}

export interface StrategyKpi {
  metric: string;
  target: string;
}

export interface StrategyVersionContent {
  context: string | null;
  objectives: string[];
  targetSegments: StrategyTargetSegment[];
  priorityProblems: string[];
  mainMessages: string[];
  responsePrinciples: string[];
  contentThemes: StrategyContentTheme[];
  risks: string[];
  kpis: StrategyKpi[];
}

export interface StrategyInsightSnapshot {
  title: string;
  description: string;
  priority: number;
  confidence: number;
}

export interface StrategyInsightLinkResponse {
  id: string;
  insightId: string;
  orderIndex: number;
  insightSnapshot: StrategyInsightSnapshot;
}

export interface StrategyVersionResponse extends StrategyVersionContent {
  id: string;
  strategyId: string;
  analysisSessionId: string;
  versionNo: number;
  status: StrategyVersionStatus;
  additionalNotes: string | null;
  aiModel: string | null;
  promptVersion: string | null;
  editedBy: string | null;
  editReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  reviewComment: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  insights: StrategyInsightLinkResponse[];
}

export interface StrategyResponse {
  id: string;
  analysisSessionId: string;
  name: string;
  currentVersionId: string | null;
  currentVersion: StrategyVersionResponse | null;
  versionCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface StrategyVersionListItemResponse {
  id: string;
  strategyId: string;
  versionNo: number;
  status: StrategyVersionStatus;
  context: string | null;
  objectives: string[];
  aiModel: string | null;
  promptVersion: string | null;
  updatedAt: string;
}

export type StrategyVersionListResponse =
  PaginatedResponse<StrategyVersionListItemResponse>;

export interface ListStrategyVersionsQuery {
  status?: StrategyVersionStatus;
  page?: number;
  pageSize?: number;
}

export interface UpdateStrategyVersionRequest {
  context?: string | null;
  objectives?: string[];
  targetSegments?: StrategyTargetSegment[];
  priorityProblems?: string[];
  mainMessages?: string[];
  responsePrinciples?: string[];
  contentThemes?: StrategyContentTheme[];
  risks?: string[];
  kpis?: StrategyKpi[];
  additionalNotes?: string | null;
  editReason?: string | null;
}

export interface ReviewStrategyVersionRequest {
  comment?: string | null;
}

export interface CreateStrategyRevisionRequest {
  name: string;
  editReason?: string | null;
}

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

// ── IAM (Giai đoạn 1: auth stub) ──

export interface IamMemberSummary {
  userId: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: OrgRole;
}

export interface IamOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  members: IamMemberSummary[];
}

export interface IamBootstrapResponse {
  organizations: IamOrganizationSummary[];
}

export interface IamMeResponse {
  organizationId: string;
  userId: string;
  role: OrgRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user: {
    id: string;
    email: string | null;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}
