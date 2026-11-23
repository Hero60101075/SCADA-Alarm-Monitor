import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SCADA Alarm Monitor",
    template: "%s · SCADA Alarm Monitor",
  },
  description: "ติดตาม alarm และผลวิเคราะห์ของสถานีไฟฟ้า",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans text-[15px] leading-relaxed">
        {/* soft blobs ด้านหลังให้ glass มีอะไรให้เบลอ */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-32 h-136 w-136 rounded-full bg-[#b9cadb] opacity-40 blur-[110px]" />
          <div className="absolute -right-40 -bottom-40 h-120 w-120 rounded-full bg-[#e7dcc9] opacity-50 blur-[120px]" />
          <div className="dot-grid absolute inset-0" />
        </div>
        <a
          href="#main"
          className="sr-only rounded-md bg-white px-3 py-2 text-sm font-medium text-steel-700 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-350 px-3 pb-16 sm:px-5 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
