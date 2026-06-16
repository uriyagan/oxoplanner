import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OXO POP Planner | UNIQOOK",
  description:
    "תכננו את האחסון שלכם: גררו קופסאות OXO POP לתוך המדף או המגירה שלכם בקנה מידה מדויק, וראו בדיוק כמה נכנס.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
