import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainLayout } from "./components/MainLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorProvider } from "./contexts/ErrorContext";
import { ToastProvider } from "./contexts/ToastContext";
import { GlobalErrorDisplay } from "./components/GlobalErrorDisplay";
import { GlobalToastDisplay } from "./components/GlobalToastDisplay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Product Management Dashboard",
  description: "A fullstack product management application built with Next.js and NestJS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorProvider>
          <ToastProvider>
            <ErrorBoundary>
              <MainLayout>
                {children}
              </MainLayout>
              <GlobalErrorDisplay />
              <GlobalToastDisplay />
            </ErrorBoundary>
          </ToastProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
