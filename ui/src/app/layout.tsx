import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/organisms/Header";
import Footer from "@/components/organisms/Footer";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "JobHub - Find your next career opportunity",
  description: "Search and apply for jobs that match your skills and career goals",
  keywords: "jobs, careers, job search, employment, hiring, job board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-50 antialiased`}>
        <div className="fixed inset-0 bg-[url('/bg-pattern.svg')] opacity-5 z-[-1]"></div>
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
