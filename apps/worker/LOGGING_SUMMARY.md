# Worker Logging System - Summary

## ✅ Đã Triển Khai

Tôi đã thêm hệ thống logging chi tiết cho Worker application để ghi nhận tất cả hoạt động vào file log. Điều này giúp bạn debug và tìm nguyên nhân khi worker không hoạt động.

## 📁 Files Đã Tạo/Sửa

### Files Mới:
1. `src/common/file-logger.ts` - File logger class ghi log ra file
2. `src/common/job-monitor.ts` - Monitor tất cả events từ BullMQ queue
3. `LOGGING.md` - Hướng dẫn chi tiết về logging system
4. `view-logs.ps1` - PowerShell script để xem logs dễ dàng
5. `.gitignore` - Ignore logs folder

### Files Đã Cập Nhật:
1. `src/main.ts` - Khởi tạo file logger và log lifecycle events
2. `src/worker.module.ts` - Log khi module initialized
3. `src/processors/normalization.processor.ts` - Log process start/complete
4. `src/processors/deduplication.processor.ts` - Log process start/complete
5. `src/processors/feedback-analysis.processor.ts` - Log process start/complete
6. `src/processors/reviews-crawl.processor.ts` - Log process start/complete và errors

## 🚀 Cách Sử Dụng

### 1. Khởi động Worker với logging:
```bash
npm run dev
```

### 2. Xem logs real-time:
```powershell
.\view-logs.ps1 tail
```

### 3. Xem tất cả logs:
```powershell
.\view-logs.ps1 all
```

### 4. Xem 100 dòng gần nhất:
```powershell
.\view-logs.ps1 latest
```

### 5. Tìm kiếm trong logs:
```powershell
.\view-logs.ps1 search "NormalizationProcessor"
.\view-logs.ps1 search "job-123"
```

### 6. Xem tất cả errors:
```powershell
.\view-logs.ps1 errors
```

## 📝 Log File Format

Log files được lưu tại: `./logs/worker-YYYY-MM-DDTHH-MM-SS-mmmZ.log`

Format mỗi dòng log:
```
[2026-07-31T08:06:22.505Z] [LEVEL] MESSAGE {"context":"json"}
```

## 🔍 Điều Được Ghi Nhận

### Application Lifecycle:
- ✅ Worker starting
- ✅ Worker started successfully
- ✅ Module initialized
- ✅ JobMonitor initialized
- ✅ Queue status (active, completed, waiting, failed jobs)
- ✅ Shutdown signals (SIGINT, SIGTERM)

### Queue Events:
- ✅ Job waiting in queue
- ✅ Job became active (đang xử lý)
- ✅ Job completed
- ✅ Job failed (kèm error reason)
- ✅ Job stalled
- ✅ Job progress updates

### Processor Events:
- ✅ **NormalizationProcessor**: Start, completion với total processed và duration
- ✅ **DeduplicationProcessor**: Start, completion với duplicates found và duration
- ✅ **FeedbackAnalysisProcessor**: Start, completion với processed/failed counts và duration
- ✅ **ReviewsCrawlProcessor**: Start, completion với pages/fetched/inserted counts, SerpAPI errors

## 🐛 Debugging Workflow

### Khi Worker Không Nhận Jobs:

1. **Check log file:**
```powershell
.\view-logs.ps1 latest
```

2. **Tìm kiếm:**
   - `WorkerModule initialized` - Module đã khởi tạo?
   - `JobMonitor initialized` - Monitor đang chạy?
   - `Queue status on startup` - Có jobs trong queue không?
   - `Job waiting in queue` hoặc `Job became active` - Jobs có vào queue?

3. **Possible causes:**
   - Redis không chạy
   - API server không đẩy jobs
   - Queue name không khớp

### Khi Jobs Bị Failed:

1. **Xem errors:**
```powershell
.\view-logs.ps1 errors
```

2. **Check log cho:**
   - `Job failed` event với error message
   - Processor-specific errors
   - Database connection errors
   - API errors (SerpAPI, AI providers)

### Khi Jobs Bị Stalled:

1. **Search for stalled:**
```powershell
.\view-logs.ps1 search "stalled"
```

2. **Check:**
   - Processor có start nhưng không complete?
   - Có errors hoặc exceptions?
   - Database timeout?
   - Network issues?

## 📊 Log Analysis Tips

1. **So sánh successful vs failed runs** để tìm pattern
2. **Check timestamp gaps** để phát hiện khi worker bị crash
3. **Monitor queue counts** để đảm bảo jobs được process
4. **Track duration times** để phát hiện performance issues
5. **Look for repeated errors** để identify systemic problems

## 🔄 Next Steps

Khi bạn chạy quy trình và worker không hoạt động:

1. Khởi động worker: `npm run dev`
2. Mở terminal mới và tail logs: `.\view-logs.ps1 tail`
3. Trigger quy trình từ API/UI
4. Quan sát logs để thấy:
   - Job có vào queue không?
   - Processor nào được gọi?
   - Có errors gì không?
   - Duration bao lâu?

Với logging này, bạn sẽ thấy chính xác:
- Worker có nhận được jobs từ queue không
- Processor nào đang xử lý
- Khi nào job complete hoặc fail
- Error messages chi tiết khi có lỗi
- Performance metrics (duration, counts)

## 📞 Report Bug

Khi report bug, hãy attach:
1. Latest log file (100 dòng cuối)
2. Error messages từ `.\view-logs.ps1 errors`
3. Queue status tại thời điểm lỗi
4. Steps to reproduce
