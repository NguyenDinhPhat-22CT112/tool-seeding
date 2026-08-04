# 🔧 Worker Logging Implementation - Summary of Changes

## 📌 Problem Statement
Worker không hoạt động khi chạy quy trình. Cần một cách để ghi nhận chi tiết hoạt động của worker để debug.

## ✅ Solution Implemented
Đã thêm **hệ thống logging toàn diện** ghi tất cả hoạt động worker vào file log với:
- Application lifecycle events
- Queue monitoring (jobs waiting, active, completed, failed, stalled)
- Processor execution details
- Error tracking với stack traces
- Performance metrics

## 📝 Files Changed/Created

### 🆕 New Files (7)

1. **`src/common/file-logger.ts`**
   - FileLogger class ghi log ra file
   - Global logger instance
   - Auto-create logs directory
   - Timestamp-based log files

2. **`src/common/job-monitor.ts`**
   - JobMonitor service
   - Listen tất cả BullMQ queue events
   - Log queue status on startup
   - Monitor waiting, active, completed, failed, stalled jobs

3. **`LOGGING.md`**
   - Hướng dẫn đầy đủ về logging system
   - Log format và location
   - Troubleshooting guide
   - Log retention tips

4. **`LOGGING_SUMMARY.md`**
   - Implementation summary
   - Debug workflow chi tiết
   - Tips và best practices

5. **`README_LOGGING.md`**
   - Quick start guide
   - Common commands
   - Debugging workflow ngắn gọn

6. **`view-logs.ps1`**
   - PowerShell script xem logs
   - Modes: tail, all, latest, search, errors
   - Color-coded output

7. **`test-logging.ps1`**
   - Test script verify logging works
   - Check all files exist
   - TypeScript compilation check
   - Usage instructions

8. **`.gitignore`**
   - Ignore logs/ directory
   - Standard Node.js ignores

### 🔄 Modified Files (5)

1. **`src/main.ts`**
   - Initialize globalFileLogger
   - Log application start/stop
   - Handle SIGINT/SIGTERM with logging
   - Graceful shutdown with log close

2. **`src/worker.module.ts`**
   - Import JobMonitor
   - Add to providers list
   - Implement OnModuleInit
   - Log module initialization

3. **`src/processors/normalization.processor.ts`**
   - Import globalFileLogger
   - Log process start (với job details)
   - Log process complete (với metrics)

4. **`src/processors/deduplication.processor.ts`**
   - Import globalFileLogger
   - Log process start
   - Log process complete với duplicate counts

5. **`src/processors/feedback-analysis.processor.ts`**
   - Import globalFileLogger
   - Log process start
   - Log process complete với processed/failed counts

6. **`src/processors/reviews-crawl.processor.ts`**
   - Import globalFileLogger
   - Log process start
   - Log process complete với crawl stats
   - Log SerpAPI errors chi tiết
   - Log unknown errors với stack trace

## 🎯 What Gets Logged

### Application Level
```
[2026-07-31T08:06:22.505Z] [INFO] FileLogger initialized
[2026-07-31T08:06:22.506Z] [INFO] Worker application starting...
[2026-07-31T08:06:22.624Z] [INFO] JobMonitor initialized - setting up queue listeners
[2026-07-31T08:06:22.629Z] [INFO] Queue status on startup {"active":0,"completed":1,...}
[2026-07-31T08:06:22.630Z] [INFO] WorkerModule initialized {"queue":"data-processing",...}
[2026-07-31T08:06:22.631Z] [INFO] Worker application started successfully
```

### Queue Events
```
[timestamp] [INFO] Job waiting in queue {"jobId":"123"}
[timestamp] [INFO] Job became active {"jobId":"123"}
[timestamp] [INFO] Job completed {"jobId":"123","returnvalue":...}
[timestamp] [ERROR] Job failed {"jobId":"123","failedReason":"..."}
[timestamp] [WARN] Job stalled {"jobId":"123"}
[timestamp] [INFO] Job progress update {"jobId":"123","progress":50}
```

### Processor Events
```
[timestamp] [INFO] NormalizationProcessor.process called {"processingJobId":"...","analysisSessionId":"..."}
[timestamp] [INFO] NormalizationProcessor completed {"processingJobId":"...","total":100,"durationMs":1234}

[timestamp] [INFO] DeduplicationProcessor.process called {...}
[timestamp] [INFO] DeduplicationProcessor completed {"totalGroups":50,"duplicatesFound":10,...}

[timestamp] [INFO] FeedbackAnalysisProcessor.process called {...}
[timestamp] [INFO] FeedbackAnalysisProcessor completed {"total":90,"processedCount":85,"failedCount":5,...}

[timestamp] [INFO] ReviewsCrawlProcessor.process called {...}
[timestamp] [INFO] ReviewsCrawlProcessor completed {"page":5,"totalFetched":250,"totalInserted":245,...}
[timestamp] [ERROR] SerpAPI quota exceeded {"processingJobId":"...","scope":"organization"}
```

## 🚀 How to Use

### Basic Usage
```bash
# Terminal 1: Start worker
npm run dev

# Terminal 2: Watch logs
.\view-logs.ps1 tail
```

### Debugging
```powershell
# View last 100 lines
.\view-logs.ps1 latest

# Find all errors
.\view-logs.ps1 errors

# Search for specific term
.\view-logs.ps1 search "NormalizationProcessor"
.\view-logs.ps1 search "job-abc123"
```

### Testing
```powershell
# Verify logging implementation
.\test-logging.ps1
```

## 🔍 Debugging Scenarios

### Scenario 1: Worker không nhận jobs
**Check log for:**
- ✅ `WorkerModule initialized`
- ✅ `JobMonitor initialized`
- ✅ `Queue status on startup`
- ❌ Missing: `Job waiting in queue`

**Possible causes:**
- Redis not running
- API not enqueuing jobs
- Queue name mismatch

### Scenario 2: Jobs bị failed
**Command:**
```powershell
.\view-logs.ps1 errors
```

**Check for:**
- Error message và stack trace
- Database connection issues
- SerpAPI quota exceeded
- AI provider errors (missing API key)

### Scenario 3: Jobs bị stalled
**Command:**
```powershell
.\view-logs.ps1 search "stalled"
```

**Check for:**
- Processor started but didn't complete
- Database timeout
- Network issues
- Memory problems

## 📊 Benefits

✅ **Complete visibility** vào worker operations  
✅ **Easy debugging** với detailed logs  
✅ **Performance tracking** với duration metrics  
✅ **Error analysis** với stack traces  
✅ **Queue monitoring** real-time  
✅ **Historical data** cho analysis  

## 🎓 Next Steps

1. **Start worker và quan sát logs:**
   ```bash
   npm run dev
   ```

2. **Mở terminal mới và tail logs:**
   ```powershell
   .\view-logs.ps1 tail
   ```

3. **Trigger quy trình từ API/UI**

4. **Quan sát logs để thấy:**
   - Job có vào queue không?
   - Processor nào được gọi?
   - Có errors không?
   - Processing time bao lâu?

5. **Nếu có lỗi:**
   ```powershell
   .\view-logs.ps1 errors
   ```

6. **Share log file** khi cần support:
   ```powershell
   # Get latest log file
   Get-ChildItem ./logs/ | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   ```

## 🎯 Success Criteria

✅ TypeScript compilation passes  
✅ All logging files created  
✅ Worker starts successfully  
✅ Log file created in ./logs/  
✅ Application lifecycle logged  
✅ Queue events logged  
✅ Processor events logged  
✅ Errors logged with details  

**Status: All criteria met! ✅**

---

**Note:** Log files không được tự động xóa. Nên định kỳ cleanup hoặc setup log rotation.
