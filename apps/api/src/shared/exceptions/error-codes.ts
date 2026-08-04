/**
 * Error code registry — nguồn chân lý duy nhất cho mọi mã lỗi domain.
 * Format: MODULE_ACTION_REASON
 *
 * Quy ước:
 * - Prefix = module (SESSION, FEEDBACK, IMPORT, AI, INSIGHT, STRATEGY, JOB)
 * - UPPERCASE + UNDERSCORE
 * - Mỗi code map sang HTTP status và message template
 * - Frontend match theo field `code` trong ApiErrorResponse
 */
export const ERROR_CODES = {
  // ── Session ──
  SESSION_NOT_FOUND: { status: 404, message: "Session không tồn tại" },
  SESSION_WRONG_STATE: {
    status: 409,
    message: "Session không ở trạng thái cho phép thao tác này",
  },
  SESSION_CONCURRENT: {
    status: 409,
    message: "Session đã bị thay đổi bởi request khác",
  },

  // ── Business ──
  BUSINESS_NOT_FOUND: { status: 404, message: "Doanh nghiệp không tồn tại" },
  BUSINESS_INACTIVE: { status: 409, message: "Doanh nghiệp đã ngừng hoạt động" },

  // ── Data Source ──
  DATA_SOURCE_NOT_FOUND: { status: 404, message: "Nguồn dữ liệu không tồn tại" },
  DATA_SOURCE_IN_USE: {
    status: 409,
    message: "Nguồn dữ liệu đang chứa feedback — không thể xóa",
  },

  // ── Review Crawl ──
  CRAWL_LOCATION_NOT_FOUND: {
    status: 404,
    message: "Địa điểm kinh doanh không tồn tại",
  },
  CRAWL_LOCATION_NOT_LINKED: {
    status: 409,
    message: "Địa điểm kinh doanh chưa liên kết với Google Maps",
  },

  // ── Feedback ──
  FEEDBACK_NOT_FOUND: { status: 404, message: "Feedback không tồn tại" },
  FEEDBACK_CONTENT_EMPTY: { status: 400, message: "Nội dung feedback không được trống" },
  FEEDBACK_INVALID_RATING: { status: 400, message: "Rating phải từ 1 đến 5" },
  FEEDBACK_IMMUTABLE: {
    status: 409,
    message: "Không thể sửa nội dung gốc của feedback",
  },

  // ── Import ──
  IMPORT_NOT_FOUND: { status: 404, message: "Import batch không tồn tại" },
  IMPORT_FILE_TOO_LARGE: {
    status: 413,
    message: "File vượt quá dung lượng cho phép (10MB)",
  },
  IMPORT_UNSUPPORTED_TYPE: {
    status: 400,
    message: "Chỉ hỗ trợ file Excel (.xlsx) và CSV (.csv)",
  },
  IMPORT_PARSE_ERROR: {
    status: 400,
    message: "Không thể đọc file — file có thể bị hỏng",
  },
  IMPORT_CONTENT_COL_REQUIRED: {
    status: 400,
    message: 'Mapping phải chứa cột "content"',
  },
  IMPORT_WRONG_STATE: {
    status: 409,
    message: "Import batch không ở trạng thái cho phép thao tác này",
  },
  IMPORT_ALL_ROWS_INVALID: {
    status: 422,
    message: "Tất cả dòng đều lỗi — không có dữ liệu hợp lệ để import",
  },

  // ── AI ──
  AI_PROVIDER_TIMEOUT: {
    status: 504,
    message: "AI provider không phản hồi trong thời gian cho phép",
  },
  AI_PROVIDER_UNAVAILABLE: {
    status: 503,
    message: "AI provider tạm thời không khả dụng",
  },
  AI_PROVIDER_RATE_LIMIT: {
    status: 429,
    message: "Đã vượt giới hạn request AI — thử lại sau",
  },
  AI_OUTPUT_INVALID: { status: 502, message: "AI trả kết quả không đúng schema" },
  AI_ANALYSIS_NOT_FOUND: { status: 404, message: "Kết quả phân tích không tồn tại" },

  // ── Processing Job ──
  JOB_NOT_FOUND: { status: 404, message: "Job không tồn tại" },
  JOB_ALREADY_RUNNING: {
    status: 409,
    message: "Đã có job đang chạy cho session này",
  },
  JOB_CANNOT_RETRY: { status: 409, message: "Chỉ job FAILED mới được retry" },
  JOB_CANNOT_CANCEL: {
    status: 409,
    message: "Chỉ job PENDING hoặc RUNNING mới được cancel",
  },

  // ── Insight ──
  INSIGHT_NOT_FOUND: { status: 404, message: "Insight không tồn tại" },
  INSIGHT_WRONG_STATE: {
    status: 409,
    message: "Insight không ở trạng thái cho phép thao tác này",
  },
  INSIGHT_CONTENT_EMPTY: {
    status: 400,
    message: "Tiêu đề và mô tả insight không được trống",
  },
  INSIGHT_INVALID_PRIORITY: {
    status: 400,
    message: "Priority phải từ 1 đến 5",
  },
  INSIGHT_INVALID_CONFIDENCE: {
    status: 400,
    message: "Confidence phải từ 0 đến 1",
  },
  INSIGHT_REJECT_NEEDS_COMMENT: {
    status: 400,
    message: "Từ chối insight phải có lý do",
  },
  INSIGHT_REANALYSIS_NEEDS_COMMENT: {
    status: 400,
    message: "Yêu cầu phân tích lại phải có lý do",
  },
  INSIGHT_MERGE_MIN_TWO: { status: 400, message: "Cần ít nhất 2 insight để gộp" },
  INSIGHT_MERGE_DIFF_SESSION: {
    status: 400,
    message: "Chỉ gộp insight cùng session",
  },
  INSIGHT_SPLIT_MIN_TWO: {
    status: 400,
    message: "Cần ít nhất 2 insight khi tách",
  },
  INSIGHT_SPLIT_NEEDS_EVIDENCE: {
    status: 400,
    message: "Mỗi insight tách phải có ít nhất 1 evidence",
  },

  // ── Strategy ──
  STRATEGY_NOT_FOUND: { status: 404, message: "Chiến lược không tồn tại" },
  STRATEGY_VERSION_NOT_FOUND: {
    status: 404,
    message: "Phiên bản chiến lược không tồn tại",
  },
  STRATEGY_WRONG_STATE: {
    status: 409,
    message: "Phiên bản không ở trạng thái cho phép thao tác này",
  },
  STRATEGY_NO_APPROVED_INSIGHTS: {
    status: 422,
    message: "Cần ít nhất 1 insight đã duyệt để tạo chiến lược",
  },
  STRATEGY_LOCKED_IMMUTABLE: {
    status: 409,
    message: "Phiên bản đã khóa — tạo version mới để chỉnh sửa",
  },
  STRATEGY_REVISION_NEEDS_COMMENT: {
    status: 400,
    message: "Yêu cầu sửa phải có nhận xét",
  },

  // ── Permission ──
  FORBIDDEN: { status: 403, message: "Bạn không có quyền thực hiện thao tác này" },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
