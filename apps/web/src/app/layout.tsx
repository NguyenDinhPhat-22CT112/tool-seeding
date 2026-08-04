import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthContextProvider } from '@/components/auth/auth-context-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Seedsight — Nền tảng phân tích chiến lược',
  description:
    'Nền tảng phân tích chiến lược seeding (gieo trồng thương hiệu) dựa trên AI, quản lý doanh nghiệp, đợt phân tích và insights.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }],
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.className} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuthContextProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
