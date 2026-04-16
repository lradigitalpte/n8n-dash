import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import { getToken } from "@/lib/auth-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "n8n-wht · Inbox",
  description: "WhatsApp agent dashboard and inbox",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers initialToken={token}>
          {/* flex (not grid) so when <Header /> is null on /dashboard, <main> is the only flex child and fills the viewport */}
          <div className="flex h-svh min-h-0 flex-col">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
