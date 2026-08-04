# View Worker Logs Script
# Usage: .\view-logs.ps1 [tail|all|search] [search_term]

param(
    [Parameter(Position=0)]
    [ValidateSet("tail", "all", "search", "errors", "latest")]
    [string]$Mode = "tail",
    
    [Parameter(Position=1)]
    [string]$SearchTerm = ""
)

$LogsDir = "./logs"

function Get-LatestLogFile {
    $latestLog = Get-ChildItem $LogsDir -Filter "worker-*.log" -ErrorAction SilentlyContinue | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($null -eq $latestLog) {
        Write-Host "No log files found in $LogsDir" -ForegroundColor Red
        exit 1
    }
    
    return $latestLog.FullName
}

function Show-Tail {
    $logFile = Get-LatestLogFile
    Write-Host "=== Tailing log file: $logFile ===" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    Get-Content $logFile -Wait -Tail 50
}

function Show-All {
    $logFile = Get-LatestLogFile
    Write-Host "=== Full log file: $logFile ===" -ForegroundColor Green
    Write-Host ""
    
    Get-Content $logFile
}

function Show-Search {
    if ($SearchTerm -eq "") {
        Write-Host "Please provide a search term" -ForegroundColor Red
        Write-Host "Usage: .\view-logs.ps1 search <term>" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "=== Searching for '$SearchTerm' in all log files ===" -ForegroundColor Green
    Write-Host ""
    
    Get-ChildItem $LogsDir -Filter "worker-*.log" | 
        ForEach-Object {
            Write-Host "File: $($_.Name)" -ForegroundColor Cyan
            Select-String -Path $_.FullName -Pattern $SearchTerm -Context 0,2
            Write-Host ""
        }
}

function Show-Errors {
    Write-Host "=== Searching for errors in all log files ===" -ForegroundColor Green
    Write-Host ""
    
    Get-ChildItem $LogsDir -Filter "worker-*.log" | 
        ForEach-Object {
            $errors = Select-String -Path $_.FullName -Pattern "\[ERROR\]" -Context 0,3
            if ($errors) {
                Write-Host "File: $($_.Name)" -ForegroundColor Cyan
                $errors | ForEach-Object {
                    Write-Host $_.Line -ForegroundColor Red
                    Write-Host ($_.Context.PostContext -join "`n") -ForegroundColor Gray
                    Write-Host ""
                }
            }
        }
}

function Show-Latest {
    $logFile = Get-LatestLogFile
    Write-Host "=== Last 100 lines of: $logFile ===" -ForegroundColor Green
    Write-Host ""
    
    Get-Content $logFile -Tail 100
}

# Main
switch ($Mode) {
    "tail" { Show-Tail }
    "all" { Show-All }
    "search" { Show-Search }
    "errors" { Show-Errors }
    "latest" { Show-Latest }
}
