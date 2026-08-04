# 📝 Worker Logging - Quick Start

## Vấn đề: Worker không hoạt động khi chạy quy trình

Tôi đã thêm **hệ thống logging chi tiết** để ghi nhận tất cả hoạt động của worker vào file log. Điều này giúp bạn tìm chính xác nguyên nhân khi worker không nhận hoặc xử lý jobs.

## 🚀 Cách sử dụng

### 1. Khởi động Worker
```bash
npm run dev
```

### 2. Xem logs real-time (terminal mới)
```powershell
.\view-logs.ps1 tail
```

### 3. Trigger quy trình từ API/UI và quan sát logs

### 4. Các lệnh hữu ích khác

```powershell
# Xem 100 dòng gần nhất
.\view-logs.ps1 latest

# Tìm kiếm errors
.\view-logs.ps1 errors

# Tìm kiếm theo keyword
.\view-logs.ps1 search "NormalizationProcessor"
.\view-logs.ps1 search "job-123"

# Xem toàn bộ log file
.\view-logs.ps1 all
```

## 📊 Thông tin được ghi log

✅ **Application lifecycle**: Start, stop, module initialization  
✅ **Queue events**: Job waiting, active, completed, failed, stalled  
✅ **Processors**: NormalizationProcessor, DeduplicationProcessor, FeedbackAnalysisProcessor, ReviewsCrawlProcessor  
✅ **Errors**: Chi tiết error messages và stack traces  
✅ **Metrics**: Duration, processed counts, performance data  

## 🔍 Debugging workflow

### Khi worker không nhận jobs:

1. Check log xem có dòng này không:
   - `WorkerModule initialized` ✅
   - `JobMonitor initialized` ✅
   - `Queue status on startup` (có jobs trong queue?)
   - `Job waiting in queue` hoặc `Job became active`

2. Nếu KHÔNG có `Job waiting/active`:
   - Redis có chạy không?
   - API server có đẩy jobs vào queue không?
   - Queue name có khớp không?

### Khi jobs bị failed:

```powershell
.\view-logs.ps1 errors
```

Check log cho:
- Error message chi tiết
- Stack trace
- Database connection errors
- API errors (SerpAPI quota, AI provider)

## 📁 Log files location

```
./logs/worker-2026-07-31T08-06-22-346Z.log
```

Format:
```
[2026-07-31T08:06:22.505Z] [INFO] Message {"context":"json"}
```

## 📚 Tài liệu chi tiết

- `LOGGING.md` - Hướng dẫn đầy đủ về logging system
- `LOGGING_SUMMARY.md` - Tóm tắt implementation và troubleshooting

## ✅ Test logging system

```powershell
.\test-logging.ps1
```

---

**Tip**: Luôn mở 2 terminals:
- Terminal 1: `npm run dev` (chạy worker)
- Terminal 2: `.\view-logs.ps1 tail` (xem logs real-time)

Như vậy bạn sẽ thấy chính xác worker đang làm gì và lỗi ở đâu! 🎯
