import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { PublicAnalyticsTracker } from "@/components/analytics/public-analytics-tracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const metadata: Metadata = {
  title: "RoundHQ",
  description:
    "Rounds, scheduling, customers, quotes, invoices, and payments for field service teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        {googleMapsApiKey ? (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
            strategy="afterInteractive"
          />
        ) : null}
        <PublicAnalyticsTracker />
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}
