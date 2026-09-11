import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Providers } from "./providers";
import { Header } from "./header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClickfieldAI Hub",
  description: "Team, attendance and project management for ClickfieldAI",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unreadCount = session?.user
    ? await prisma.notification.count({ where: { recipientId: session.user.id, read: false } })
    : 0;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          {session?.user && (
            <Header name={session.user.name ?? session.user.email ?? ""} role={session.user.role} unreadCount={unreadCount} />
          )}
          <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
