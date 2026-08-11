# 🎯 QUY TRÌNH API ĐẦY ĐỦ - CHẠY PIPELINE TỪ ĐẦU ĐẾN CUỐI

## 📋 Headers Cần Thiết Cho Tất Cả API Calls

```bash
Content-Type: application/json
x-user-id: user_demo_admin
x-organization-id: org_demo
x-user-role: ORG_ADMIN
```

---

## 🏢 GIAI ĐOẠN 0: KHỞI TẠO DOANH NGHIỆP & ĐỊA ĐIỂM (New Business Setup)

Khi có một doanh nghiệp mới cần phân tích chiến lược, ta cần thực hiện tạo doanh nghiệp và các địa điểm của doanh nghiệp đó trong hệ thống trước khi tạo Analysis Session. Ta có 2 cách thực hiện: tạo thủ công hoặc import trực tiếp từ Google Maps (SerpAPI).

---

### Step 0.1: Kiểm tra kết nối SerpApi (Optional)

**Endpoint:** `GET /serpapi/status`

**Request:**
```bash
curl http://localhost:4000/api/serpapi/status \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "status": "OK",
  "remainingQuota": 98,
  "totalQuota": 100
}
```

---

### Step 0.2: Tìm kiếm địa điểm trên Google Maps (SerpApi Autocomplete)

Dùng để tìm kiếm các địa điểm dựa trên từ khóa nhằm lấy `placeId`.

**Endpoint:** `POST /serpapi/autocomplete`

**Request:**
```bash
curl -X POST http://localhost:4000/api/serpapi/autocomplete \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "input": "Highlands Coffee Bitexco",
    "sessionToken": "session-abc-123"
  }'
```

**Response:**
```json
{
  "predictions": [
    {
      "placeId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
      "description": "Highlands Coffee Bitexco, Hải Triều, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam"
    }
  ],
  "sessionToken": "session-abc-123"
}
```

---

### Step 0.3: Xem thông tin chi tiết địa điểm (SerpApi Preview)

Dùng để xem trước thông tin chi tiết của địa điểm trước khi lưu/import.

**Endpoint:** `POST /serpapi/preview`

**Request:**
```bash
curl -X POST http://localhost:4000/api/serpapi/preview \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "placeId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
    "sessionToken": "session-abc-123"
  }'
```

**Response:**
```json
{
  "provider": "SERPAPI",
  "placeId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
  "displayName": "Highlands Coffee Bitexco",
  "formattedAddress": "Tháp Tài Chính Bitexco, 4F-03, 45 Ngô Đức Kế, Sài Gòn, Hồ Chí Minh 70000, Việt Nam",
  "types": ["cafe", "food", "point_of_interest", "establishment"],
  "primaryType": "cafe",
  "businessStatus": "OPERATIONAL",
  "mapsUrl": "https://maps.google.com/?cid=...",
  "nationalPhoneNumber": "028 1234 5678",
  "websiteUri": "https://highlandscoffee.com",
  "rating": 4.2,
  "userRatingCount": 520
}
```

---

### Step 0.4: Khởi tạo doanh nghiệp mới

Có hai phương án để khởi tạo doanh nghiệp:

#### Phương án A: Tạo doanh nghiệp thủ công (Manual Create)

Dùng khi muốn tự định nghĩa thông tin chi tiết của doanh nghiệp.

**Endpoint:** `POST /businesses`

**Request:**
```bash
curl -X POST http://localhost:4000/api/businesses \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "name": "Highlands Coffee",
    "industry": "F&B",
    "description": "Chuỗi cửa hàng cà phê nổi tiếng tại Việt Nam",
    "website": "https://highlandscoffee.com",
    "address": "123 Nguyễn Huệ, Quận 1, TP. HCM",
    "phone": "028 1234 5678",
    "email": "contact@highlandscoffee.com",
    "brandVoice": "Thân thiện, trẻ trung",
    "products": [
      { "name": "Phin Sữa Đá", "description": "Cà phê phin truyền thống kết hợp sữa đặc" }
    ],
    "targetAudience": [
      { "segment": "Nhân viên văn phòng", "characteristics": "Tuổi 22-45, thích không gian làm việc tiện nghi" }
    ],
    "competitors": [
      { "name": "The Coffee House", "notes": "Cạnh tranh phân khúc đồ uống trẻ trung" }
    ],
    "strengths": ["Thương hiệu lâu đời", "Vị trí đắc địa"]
  }'
```

**Response:**
```json
{
  "id": "cmsa47wp6000ak5nsza0e9x8q",
  "name": "Highlands Coffee",
  "industry": "F&B",
  "status": "ACTIVE",
  "createdAt": "2026-08-01T09:00:00.000Z"
}
```

#### Phương án B: Tạo doanh nghiệp tự động từ SerpApi (Import from SerpApi)

Dùng để tạo nhanh doanh nghiệp và địa điểm của nó từ dữ liệu Google Maps.

**Endpoint:** `POST /businesses/from-serpapi`

**Request:**
```bash
curl -X POST http://localhost:4000/api/businesses/from-serpapi \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "placeId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
    "sessionToken": "session-abc-123",
    "includeLocation": true,
    "name": "Highlands Coffee Bitexco",
    "industry": "F&B"
  }'
```

**Response:**
```json
{
  "business": {
    "id": "cmsa47wp6000ak5nsza0e9x8q",
    "name": "Highlands Coffee Bitexco",
    "industry": "F&B",
    "status": "ACTIVE",
    "createdAt": "2026-08-01T09:05:00.000Z"
  },
  "location": {
    "id": "cmsa47wq8000ck5nsixht3kcs",
    "businessId": "cmsa47wp6000ak5nsza0e9x8q",
    "name": "Highlands Coffee Bitexco",
    "address": "Tháp Tài Chính Bitexco, 4F-03, 45 Ngô Đức Kế, Sài Gòn, Hồ Chí Minh 70000, Việt Nam",
    "phone": "028 1234 5678",
    "website": "https://highlandscoffee.com",
    "primaryType": "cafe",
    "serpapiPlaceId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
    "source": "SERPAPI",
    "isActive": true
  }
}
```

---

### Step 0.5: Thêm địa điểm vào doanh nghiệp đã có (Add Location from SerpApi)

Nếu doanh nghiệp đã được tạo (Phương án A) và muốn liên kết thêm các chi nhánh (địa điểm) từ Google Maps.

**Endpoint:** `POST /businesses/:businessId/locations/from-serpapi`

**Request:**
```bash
curl -X POST http://localhost:4000/api/businesses/cmsa47wp6000ak5nsza0e9x8q/locations/from-serpapi \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "placeId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
    "sessionToken": "session-abc-123",
    "name": "Highlands Coffee Bitexco"
  }'
```

**Response:**
```json
{
  "id": "cmsa47wq8000ck5nsixht3kcs",
  "businessId": "cmsa47wp6000ak5nsza0e9x8q",
  "name": "Highlands Coffee Bitexco",
  "address": "Tháp Tài Chính Bitexco, 4F-03, 45 Ngô Đức Kế, Sài Gòn, Hồ Chí Minh 70000, Việt Nam",
  "phone": "028 1234 5678",
  "website": "https://highlandscoffee.com",
  "primaryType": "cafe",
  "serpapiPlaceId": "ChIJa9QdwOEvdTEROTBUo5d5GjM",
  "source": "SERPAPI",
  "isActive": true,
  "createdAt": "2026-08-01T09:10:00.000Z",
  "updatedAt": "2026-08-01T09:10:00.000Z"
}
```

---

## 🔄 GIAI ĐOẠN 1: DRAFT → DATA_COLLECTION

### Step 1.1: Tạo Analysis Session

**Endpoint:** `POST /analysis-sessions`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "businessId": "cmsa47wp6000ak5nsza0e9x8q",
    "name": "Phân tích Q3 2026",
    "objective": "Tìm hiểu feedback khách hàng về dịch vụ và sản phẩm mới",
    "focusProduct": "Iced Coffee mới",
    "dateFrom": "2026-07-01",
    "dateTo": "2026-09-30"
  }'
```

**Response:**
```json
{
  "id": "session_xyz123",
  "businessId": "cmsa47wp6000ak5nsza0e9x8q",
  "name": "Phân tích Q3 2026",
  "status": "DRAFT",
  "objective": "Tìm hiểu feedback khách hàng...",
  "createdAt": "2026-08-01T10:00:00Z"
}
```

**State sau bước này:** `DRAFT`

---

### Step 1.2: Bắt đầu thu thập dữ liệu

**Endpoint:** `POST /analysis-sessions/:id/start-data-collection`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/start-data-collection \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "id": "session_xyz123",
  "status": "DATA_COLLECTION",
  "businessSnapshot": {
    "name": "Starbucks Coffee Company",
    "industry": "F&B",
    "snapshotAt": "2026-08-01T10:05:00Z"
  }
}
```

**State sau bước này:** `DATA_COLLECTION`

---

## 🕷️ GIAI ĐOẠN 2: THU THẬP DỮ LIỆU

### Step 2: Trigger Crawl Google Reviews

**Endpoint:** `POST /analysis-sessions/:sessionId/review-crawl`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/review-crawl \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "businessLocationId": "cmsa47wq8000ck5nsixht3kcs"
  }'
```

**Response:**
```json
{
  "dataSourceId": "ds_abc456",
  "jobId": "job_crawl_789",
  "jobStatus": "PENDING",
  "businessLocationId": "cmsa47wq8000ck5nsixht3kcs",
  "name": "Starbucks Coffee Company - Google Reviews",
  "dataSourceStatus": "PENDING",
  "idempotent": false
}
```

**State vẫn là:** `DATA_COLLECTION` (chỉ đang crawl data)

---

### Step 2.1: Check Job Status (optional - để theo dõi)

**Endpoint:** `GET /processing-jobs/:jobId`

**Request:**
```bash
curl http://localhost:4000/api/processing-jobs/job_crawl_789 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "id": "job_crawl_789",
  "jobType": "REVIEW_CRAWLING",
  "status": "RUNNING",
  "progress": 45,
  "totalItems": 250,
  "processedItems": 112,
  "message": "Crawling page 3/5...",
  "startedAt": "2026-08-01T10:10:00Z"
}
```

**Các status có thể:**
- `PENDING` - Chờ worker xử lý
- `RUNNING` - Đang chạy
- `COMPLETED` - Hoàn thành
- `FAILED` - Lỗi
- `CANCELLED` - Bị hủy

**Tip:** Poll endpoint này mỗi 2-5 giây cho đến khi `status === "COMPLETED"`

---

## ⚙️ GIAI ĐOẠN 3: XỬ LÝ DỮ LIỆU (Processing Pipeline)

### Step 3: Trigger Processing Pipeline

**Endpoint:** `POST /analysis-sessions/:sessionId/process`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/process \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "pipelineId": "pipeline_def123",
  "idempotent": false,
  "jobs": [
    {
      "id": "job_norm_456",
      "jobType": "DATA_NORMALIZATION",
      "status": "PENDING"
    },
    {
      "id": "job_dedup_789",
      "jobType": "DEDUPLICATION",
      "status": "PENDING"
    },
    {
      "id": "job_feedback_012",
      "jobType": "AI_FEEDBACK_ANALYSIS",
      "status": "PENDING"
    }
  ]
}
```

**State transition:** `DATA_COLLECTION` → `PROCESSING`

**Pipeline sẽ chạy tuần tự:**
1. ✅ **Normalization** (1-2 phút) - Clean text, tạo hash
2. ✅ **Deduplication** (30s-1m) - Mark duplicates
3. ✅ **AI Feedback Analysis** (10-20 phút với Groq) - Phân tích từng feedback

**State sau pipeline hoàn thành:** `ANALYZING`

---

### Step 3.1: Monitor Pipeline Progress

**List tất cả jobs của session:**

```bash
curl "http://localhost:4000/api/processing-jobs?analysisSessionId=session_xyz123&pageSize=20" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Check từng job cụ thể:**

```bash
# Job Normalization
curl http://localhost:4000/api/processing-jobs/job_norm_456 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"

# Job Feedback Analysis (quan trọng nhất - mất thời gian nhất)
curl http://localhost:4000/api/processing-jobs/job_feedback_012 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Tip:** Poll job `AI_FEEDBACK_ANALYSIS` để xem progress. Khi job này `COMPLETED`, session sẽ tự động chuyển sang `ANALYZING`.

---

## 💡 GIAI ĐOẠN 4: SINH INSIGHTS

### Step 4: Trigger Insight Generation

**Endpoint:** `POST /analysis-sessions/:sessionId/insight-generation`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/insight-generation \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "pipelineId": "pipeline_insight_456",
  "idempotent": false,
  "jobs": [
    {
      "id": "job_insight_789",
      "jobType": "INSIGHT_GENERATION",
      "status": "PENDING"
    }
  ]
}
```

**State transition:** `ANALYZING` → `INSIGHT_REVIEW` (sau khi job hoàn thành)

**Thời gian:** 2-5 phút (Gemini/OpenRouter free)

---

### Step 4.1: Check Insight Generation Progress

```bash
curl http://localhost:4000/api/processing-jobs/job_insight_789 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Khi job completed, kiểm tra insights:**

```bash
curl "http://localhost:4000/api/analysis-sessions/session_xyz123/insights?status=PENDING_REVIEW&pageSize=50" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "items": [
    {
      "id": "insight_001",
      "title": "Khách hàng yêu cầu wifi nhanh hơn",
      "description": "80% feedback than phiền về tốc độ wifi...",
      "category": "SERVICE",
      "severity": "HIGH",
      "frequency": 85,
      "status": "PENDING_REVIEW",
      "confidence": 0.92
    },
    {
      "id": "insight_002",
      "title": "Iced Coffee mới được đón nhận tích cực",
      "description": "Nhiều khách khen ngợi hương vị mới...",
      "category": "PRODUCT",
      "severity": "MEDIUM",
      "frequency": 65,
      "status": "PENDING_REVIEW",
      "confidence": 0.88
    }
  ],
  "total": 15
}
```

---

## ✅ GIAI ĐOẠN 5: DUYỆT INSIGHTS (Manual Step)

### Step 5: Approve/Reject Insights

**Approve một insight:**

```bash
curl -X PATCH http://localhost:4000/api/analysis-sessions/session_xyz123/insights/insight_001 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "status": "APPROVED",
    "reviewNote": "Quan trọng - cần ưu tiên"
  }'
```

**Reject một insight:**

```bash
curl -X PATCH http://localhost:4000/api/analysis-sessions/session_xyz123/insights/insight_003 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  -d '{
    "status": "REJECTED",
    "reviewNote": "Không liên quan đến mục tiêu phân tích"
  }'
```

**Auto-approve tất cả insights (for testing):**

```bash
# Lấy list insights
curl "http://localhost:4000/api/analysis-sessions/session_xyz123/insights?status=PENDING_REVIEW&pageSize=100" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" | jq -r '.items[].id' | while read insightId; do
  curl -X PATCH "http://localhost:4000/api/analysis-sessions/session_xyz123/insights/$insightId" \
    -H "Content-Type: application/json" \
    -H "x-user-id: user_demo_admin" \
    -H "x-organization-id: org_demo" \
    -H "x-user-role: ORG_ADMIN" \
    -d '{"status": "APPROVED"}'
  echo "Approved: $insightId"
done
```

**State vẫn là:** `INSIGHT_REVIEW`

---

## 🎯 GIAI ĐOẠN 6: SINH CHIẾN LƯỢC

### Step 6: Trigger Strategy Generation

**Endpoint:** `POST /analysis-sessions/:sessionId/strategy-generation`

**Request:**
```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/strategy-generation \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "pipelineId": "pipeline_strategy_789",
  "idempotent": false,
  "jobs": [
    {
      "id": "job_strategy_012",
      "jobType": "STRATEGY_GENERATION",
      "status": "PENDING"
    }
  ]
}
```

**State transition:** `INSIGHT_REVIEW` → `STRATEGY_BUILDING` (sau khi job hoàn thành)

**Thời gian:** 2-5 phút (Gemini/OpenRouter free)

---

### Step 6.1: Check Strategy Generation Progress

```bash
curl http://localhost:4000/api/processing-jobs/job_strategy_012 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Khi job completed, xem strategies:**

```bash
curl http://localhost:4000/api/analysis-sessions/session_xyz123/strategies \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**Response:**
```json
{
  "items": [
    {
      "id": "strategy_001",
      "name": "Chiến lược cải thiện dịch vụ Q4 2026",
      "description": "Tập trung vào cải thiện wifi và đào tạo nhân viên...",
      "objectives": [
        "Nâng cấp hạ tầng wifi lên 200Mbps",
        "Đào tạo nhân viên về customer service"
      ],
      "tactics": [
        {
          "name": "Upgrade Wifi Infrastructure",
          "description": "Hợp tác nhà mạng...",
          "priority": "HIGH"
        }
      ],
      "metrics": [
        {
          "name": "Customer Satisfaction Score",
          "target": "4.5/5.0",
          "baseline": "3.8/5.0"
        }
      ],
      "createdAt": "2026-08-01T11:00:00Z"
    }
  ]
}
```

---

## 🏁 GIAI ĐOẠN 7: HOÀN TẤT HOẶC LƯU TRỮ

### Step 7.1: Hoàn tất session

```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/complete \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**State transition:** `STRATEGY_BUILDING` → `COMPLETED`

---

### Step 7.2: Lưu trữ session (optional)

```bash
curl -X POST http://localhost:4000/api/analysis-sessions/session_xyz123/archive \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

**State transition:** `[Any]` → `ARCHIVED`

---

## 📊 API BỔ SUNG - THEO DÕI VÀ QUẢN LÝ

### Xem chi tiết session bất kỳ lúc nào

```bash
curl http://localhost:4000/api/analysis-sessions/session_xyz123 \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

### List tất cả feedback đã thu thập

```bash
curl "http://localhost:4000/api/analysis-sessions/session_xyz123/feedback?pageSize=20" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

### List tất cả processing jobs

```bash
curl "http://localhost:4000/api/processing-jobs?analysisSessionId=session_xyz123" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

### Retry failed job

```bash
curl -X POST http://localhost:4000/api/processing-jobs/job_abc123/retry \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

### Cancel running job

```bash
curl -X POST http://localhost:4000/api/processing-jobs/job_abc123/cancel \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN"
```

---

## 🎯 TỔNG KẾT FLOW

```
0. Khởi tạo doanh nghiệp & Địa điểm:
   - POST /api/serpapi/autocomplete (Tìm kiếm địa điểm)
   - POST /api/serpapi/preview (Xem thông tin chi tiết địa điểm)
   - POST /api/businesses (Tạo doanh nghiệp thủ công) HOẶC POST /api/businesses/from-serpapi (Tạo từ SerpApi)
   - POST /api/businesses/:businessId/locations/from-serpapi (Thêm địa điểm nếu cần)

1. POST /analysis-sessions
   → Status: DRAFT

2. POST /analysis-sessions/:id/start-data-collection
   → Status: DATA_COLLECTION

3. POST /analysis-sessions/:id/review-crawl
   → Job: REVIEW_CRAWLING (chạy background)
   → Poll: GET /processing-jobs/:jobId

4. POST /analysis-sessions/:id/process
   → Status: PROCESSING
   → Jobs: NORMALIZATION → DEDUPLICATION → AI_FEEDBACK_ANALYSIS
   → Auto transition: PROCESSING → ANALYZING

5. POST /analysis-sessions/:id/insight-generation
   → Job: INSIGHT_GENERATION
   → Auto transition: ANALYZING → INSIGHT_REVIEW

6. PATCH /analysis-sessions/:id/insights/:insightId
   → Approve/Reject insights (manual step)

7. POST /analysis-sessions/:id/strategy-generation
   → Job: STRATEGY_GENERATION
   → Auto transition: INSIGHT_REVIEW → STRATEGY_BUILDING

8. POST /analysis-sessions/:id/complete
   → Status: COMPLETED
```

---

## ⏱️ THỜI GIAN ƯỚC TÍNH

| Giai Đoạn | Thời Gian | Provider |
|-----------|-----------|----------|
| Crawl Reviews | 2-5 phút | SerpAPI |
| Normalization | 1-2 phút | Logic |
| Deduplication | 30s-1 phút | Logic |
| **Feedback Analysis** | **10-20 phút** | **Groq (llama-3.3-70b)** |
| **Insight Generation** | **2-5 phút** | **Groq (llama-3.3-70b)** |
| Review Insights | Manual | User |
| **Strategy Generation** | **2-5 phút** | **Gemini/OpenRouter free** |
| **TOTAL** | **~20-40 phút** | |

---

## 🔧 TIPS & TRICKS

### 1. Polling Job Status
Tạo script nhỏ để tự động poll:

```bash
#!/bin/bash
JOB_ID=$1
while true; do
  STATUS=$(curl -s http://localhost:4000/api/processing-jobs/$JOB_ID \
    -H "x-user-id: user_demo_admin" \
    -H "x-organization-id: org_demo" \
    -H "x-user-role: ORG_ADMIN" | jq -r '.status')
  
  echo "Job $JOB_ID: $STATUS"
  
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  
  sleep 3
done
```

### 2. Batch Approve Insights
Dùng `jq` để parse và approve tất cả:

```bash
curl "http://localhost:4000/api/analysis-sessions/session_xyz123/insights?status=PENDING_REVIEW&pageSize=100" \
  -H "x-user-id: user_demo_admin" \
  -H "x-organization-id: org_demo" \
  -H "x-user-role: ORG_ADMIN" \
  | jq -r '.items[].id' \
  | xargs -I {} curl -X PATCH "http://localhost:4000/api/analysis-sessions/session_xyz123/insights/{}" \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_demo_admin" \
      -H "x-organization-id: org_demo" \
      -H "x-user-role: ORG_ADMIN" \
      -d '{"status": "APPROVED"}'
```

### 3. Monitor Worker Logs
```bash
cd apps/worker/logs
tail -f worker-*.log | grep -E "completed|provider|model|Duration"
```

### 4. Check AI Provider Config
```bash
# In worker .env
echo $AI_PROVIDER  # Should be: groq
echo $AI_INSIGHT_STRATEGY_PROVIDER  # Should be: groq
```

---

## ❌ ERROR HANDLING

### Session Wrong State
```json
{
  "statusCode": 409,
  "code": "SESSION_WRONG_STATE",
  "message": "Session không ở trạng thái cho phép thao tác này"
}
```
**Fix:** Check current status, ensure đúng state transition

### Job Failed
```json
{
  "id": "job_abc",
  "status": "FAILED",
  "errorMessage": "AI provider timeout"
}
```
**Fix:** Retry job hoặc check worker logs

### Quota Exceeded (SerpAPI)
```json
{
  "statusCode": 429,
  "message": "SerpAPI monthly quota exceeded"
}
```
**Fix:** Wait hoặc upgrade SerpAPI plan

---

**File này là guide đầy đủ! Save lại để tham khảo khi chạy pipeline. 🚀**
