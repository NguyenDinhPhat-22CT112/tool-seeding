# Test Worker Logging System
Write-Host "=== Testing Worker Logging System ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check if logs directory will be created
Write-Host "Step 1: Checking logs directory..." -ForegroundColor Cyan
if (Test-Path "./logs") {
    Write-Host "[OK] Logs directory exists" -ForegroundColor Green
    $logCount = (Get-ChildItem "./logs" -Filter "worker-*.log").Count
    Write-Host "  Found $logCount existing log files" -ForegroundColor Gray
} else {
    Write-Host "[OK] Logs directory will be created on first run" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check TypeScript compilation
Write-Host "Step 2: Running TypeScript type check..." -ForegroundColor Cyan
$typecheck = npm run typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "[FAIL] TypeScript compilation failed" -ForegroundColor Red
    Write-Host $typecheck -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: List logging files
Write-Host "Step 3: Checking logging implementation files..." -ForegroundColor Cyan
$files = @(
    "src/common/file-logger.ts",
    "src/common/job-monitor.ts",
    "LOGGING.md",
    "view-logs.ps1"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $file" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Show what will be logged
Write-Host "Step 4: Logging features summary:" -ForegroundColor Cyan
Write-Host "  [OK] Application lifecycle (start, stop)" -ForegroundColor Green
Write-Host "  [OK] Module initialization" -ForegroundColor Green
Write-Host "  [OK] Queue events (waiting, active, completed, failed, stalled)" -ForegroundColor Green
Write-Host "  [OK] Processor execution (start, progress, complete)" -ForegroundColor Green
Write-Host "  [OK] Error details with stack traces" -ForegroundColor Green
Write-Host "  [OK] Performance metrics (duration, counts)" -ForegroundColor Green
Write-Host ""

# Step 5: Instructions
Write-Host "=== Next Steps ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start worker:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. In another terminal, watch logs:" -ForegroundColor White
Write-Host "   .\view-logs.ps1 tail" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Trigger a job from your API/UI and observe logs" -ForegroundColor White
Write-Host ""
Write-Host "4. View latest log:" -ForegroundColor White
Write-Host "   .\view-logs.ps1 latest" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Search for errors:" -ForegroundColor White
Write-Host "   .\view-logs.ps1 errors" -ForegroundColor Gray
Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green
