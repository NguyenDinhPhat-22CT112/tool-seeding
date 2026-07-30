import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware chạy cho mọi request trước khi route handler.
// Auth check sẽ được thêm ở T11 khi có Authentication.
export function middleware(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  // Bỏ qua file tĩnh và API route nội bộ
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
