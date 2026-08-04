# Worker Application Logging

## Overview

Worker application đã được trang bị hệ thống logging chi tiết để ghi nhận tất cả hoạt động vào file log. Điều này giúp debug và theo dõi các vấn đề khi worker không hoạt động như mong đợi.

## Log File Location

Các file log được lưu trong thư mục `./logs/` với tên file theo format:
```
worker-YYYY-MM-DDTHH-MM-SS-mmmZ.log
```

Ví dụ: `worker-2024-01-15T10-30-45-123Z.log`

## What Is Logged

### 1. Application Lifecycle
- Worker application starting
- Worker application started successfully
- WorkerModule initialized
- JobMonitor initialized
- Application shutdown events (SIGINT, SIGTERM)

### 2. Queue Events
- **waiting**: Job được thêm vào queue và đang chờ xử lý
- **active**: Job bắt đầu được xử lý
- **completed**: Job hoàn thành thành công
- **failed**: Job thất bại (kèm error message và stack trace)
- **stalled**: Job bị stalled (không response)
- **progress**: Cập nhật tiến độ của job

### 3. Processor Events

#### NormalizationProcessor
- Process called (với jobId, analysisSessionId, organizationId)
- Process completed (với total feedbacks processed, duration)

#### DeduplicationProcessor
- Process called
- Process completed (với total groups, duplicates found, duration)

#### FeedbackAnalysisProcessor
- Process called
- Process completed (với total, processed count, failed count, duration)

#### ReviewsCrawlProcessor
- Process called
- Process completed (với pages crawled, total fetched, total inserted, duration)
- SerpAPI errors (quota exceeded, client errors)
- Unknown errors (với stack trace)

## How to Use

### 1. Start Worker
```bash
npm run dev
```

### 2. Monitor Logs in Real-time
```bash
# Windows PowerShell
Get-Content ./logs/worker-*.log -Wait -Tail 50

# Or use a text editor with auto-refresh
```

### 3. Check Latest Log File
```bash
# Windows PowerShell
Get-ChildItem ./logs/ | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 100
```

### 4. Search for Specific Events
```bash
# Search for errors
Select-String -Path ./logs/worker-*.log -Pattern "ERROR"

# Search for specific processor
Select-String -Path ./logs/worker-*.log -Pattern "NormalizationProcessor"

# Search for specific job ID
Select-String -Path ./logs/worker-*.log -Pattern "jobId-123"
```

## Log Format

Each log line follows this format:
```
[ISO_TIMESTAMP] [LEVEL] MESSAGE CONTEXT_JSON
```

Example:
```
[2024-01-15T10:30:45.123Z] [INFO] NormalizationProcessor.process called {"processingJobId":"job-123","analysisSessionId":"session-456","organizationId":"org-789","jobType":"NORMALIZATION","bullmqJobId":"1"}
```

## Troubleshooting

### Problem: Worker không nhận jobs

**Check log file for:**
1. `WorkerModule initialized` - Xác nhận module đã khởi tạo
2. `JobMonitor initialized` - Xác nhận monitor đang lắng nghe queue
3. `Queue status on startup` - Kiểm tra số lượng jobs trong queue
4. `Job waiting in queue` hoặc `Job became active` - Xác nhận jobs có vào queue không

**Possible causes:**
- Redis không chạy hoặc không kết nối được
- API server không đẩy jobs vào queue
- Queue name không khớp giữa API và Worker

### Problem: Jobs bị failed

**Check log file for:**
1. `Job failed` event - Có error message và stack trace
2. Processor-specific errors:
   - Database connection issues
   - SerpAPI quota/errors
   - AI provider errors (missing API key)

**Common errors:**
- `Session not found` - analysisSessionId không tồn tại trong DB
- `SerpAPI quota exceeded` - Đã hết quota
- `AI provider error` - Thiếu API key hoặc quota

### Problem: Jobs bị stalled

**Check log file for:**
1. `Job stalled` event
2. Check if processor started but didn't complete
3. Look for errors or exceptions trong processor logs

**Possible causes:**
- Database query timeout
- Network issues (SerpAPI, AI provider)
- Memory issues
- Infinite loop in code

## Log Retention

Log files không tự động xóa. Bạn nên:
1. Định kỳ xóa log cũ
2. Hoặc setup log rotation tool
3. Hoặc compress old logs

Example cleanup script:
```powershell
# Delete logs older than 7 days
Get-ChildItem ./logs/ -Filter "worker-*.log" | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
  Remove-Item
```

## Tips

1. **Always check logs first** khi có vấn đề
2. **Keep logs for at least 3-7 days** để phân tích issues
3. **Compare successful vs failed runs** để tìm pattern
4. **Monitor queue status** để đảm bảo jobs đang được process
5. **Check timestamp gaps** để phát hiện khi worker bị crash
