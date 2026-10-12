import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GCC Atlas — India's GCC Decision Workspace",
  description: "Evidence-informed research workspace for planning Global Capability Centres (GCCs) in India. Compare cities, explore companies, and research with AI assistance.",
  keywords: ["GCC", "Global Capability Centre", "India", "Bengaluru", "Hyderabad", "Pune", "offshoring", "capability centre"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}

