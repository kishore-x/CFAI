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
  let unreadCount = 0;
  let unreadMessages = 0;
  if (session?.user) {
    const [notifCount, participants] = await Promise.all([
      prisma.notification.count({ where: { recipientId: session.user.id, read: false } }),
      prisma.conversationParticipant.findMany({
        where: { employeeId: session.user.id },
        select: {
          lastReadAt: true,
          conversation: { select: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, senderId: true } } } },
        },
      }),
    ]);
    unreadCount = notifCount;
    unreadMessages = participants.filter((p) => {
      const last = p.conversation.messages[0];
      if (!last || last.senderId === session.user.id) return false;
      return !p.lastReadAt || last.createdAt > p.lastReadAt;
    }).length;
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          {session?.user && (
            <Header
              name={session.user.name ?? session.user.email ?? ""}
              role={session.user.role}
              unreadCount={unreadCount}
              unreadMessages={unreadMessages}
            />
          )}
          <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
