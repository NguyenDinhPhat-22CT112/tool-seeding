# Cấu hình Port cho Dự án

## 🔌 Ports được sử dụng

Dự án này sử dụng các port sau (tránh conflict với port 3000, 3001):

| Service | Port | URL |
|---------|------|-----|
| **Frontend (Web)** | `4001` | http://localhost:4001 |
| **Backend (API)** | `4000` | http://localhost:4000 |
| **API Docs (Swagger)** | `4000` | http://localhost:4000/api-docs |
| **Worker** | - | Background process (không cần port) |
| **PostgreSQL** | `5432` | localhost:5432 |
| **Redis** | `6379` | localhost:6379 |

## 📝 Files cần cấu hình

### 1. API Configuration
**File**: `apps/api/.env`
```env
API_PORT=4000
```

### 2. Web Configuration
**File**: `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**File**: `apps/web/package.json`
```json
"dev": "next dev --turbopack --port 4001"
```

### 3. Root .env.example
**File**: `.env.example`
```env
WEB_PORT=4001
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## 🚀 Lệnh chạy nhanh

```bash
# Chạy tất cả services
pnpm dev

# Truy cập:
# - Frontend: http://localhost:4001
# - API: http://localhost:4000
# - Swagger UI: http://localhost:4000/api-docs
```

## 🔄 Thay đổi Port (nếu cần)

Nếu bạn muốn dùng port khác, thay đổi trong:

1. **API**: Sửa `API_PORT` trong `apps/api/.env`
2. **Web**: 
   - Sửa `--port` trong `apps/web/package.json`
   - Sửa `NEXT_PUBLIC_API_URL` trong `apps/web/.env.local`

### Ví dụ: Đổi sang port 5000/5001

```env
# apps/api/.env
API_PORT=5000

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# apps/web/package.json
"dev": "next dev --turbopack --port 5001"
```

## ⚠️ Lưu ý

- **Port 3000, 3001**: Đã có dự án khác sử dụng → Không dùng
- **Port 4000, 4001**: Port hiện tại của dự án này
- **Port 5432**: PostgreSQL (default)
- **Port 6379**: Redis (default)

## 🛠️ Kiểm tra Port đang dùng

```bash
# Windows
netstat -ano | findstr :4000
netstat -ano | findstr :4001

# Nếu port bận, kill process:
taskkill /PID <PID_NUMBER> /F
```

## 📚 Tham khảo

- [Getting Started Guide](docs/GETTING-STARTED.md)
- [System Overview](docs/architecture/system-overview.md)
