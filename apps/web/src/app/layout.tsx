import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/providers";
import "./styles.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Seedsight — Không gian phân tích khách hàng",
  description:
    "Quản lý doanh nghiệp, địa điểm và các đợt phân tích khách hàng trong một không gian thống nhất.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={inter.className}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
