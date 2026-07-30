# Seeding Strategy Tool

Monorepo dùng kiến trúc **modular monolith**:

- `apps/web`: giao diện Next.js.
- `apps/api`: REST API NestJS và composition root của hệ thống.
- `apps/worker`: tiến trình NestJS xử lý BullMQ jobs.
- `packages/*`: contracts, validation và cấu hình dùng chung; không chứa business logic.
- `infrastructure/*`: tài nguyên chạy ứng dụng.
- `docs/*`: quyết định kiến trúc, API, database và workflow.

## Yêu cầu

- Node.js 22+
- pnpm 10+
- Docker / Docker Compose

## Khởi động local

```bash
pnpm install
docker compose up -d postgres redis
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

Xem [mục lục tài liệu](docs/README.md) để chọn lộ trình đọc phù hợp. Trước khi thêm module nghiệp vụ, đọc [quy tắc kiến trúc](docs/architecture/modular-monolith.md).
