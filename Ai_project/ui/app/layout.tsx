import './globals.css';
import { Inter } from 'next/font/google';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Morocco Job Search Platform',
  description: 'Find your dream tech job in Morocco with AI-powered search and insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`}>
        <NavBar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
} 