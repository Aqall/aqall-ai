import type { Metadata } from 'next';
import { Inter, Cairo, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';
import { ConditionalNavbar } from '@/components/ConditionalNavbar';
import '@/index.css';

// Optimize font loading with Next.js font optimization
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  preload: true,
});

export const metadata: Metadata = {
  title: 'Aqall - AI Website Builder',
  description: 'Build websites with AI in Arabic or English',
  icons: {
    icon: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={`${inter.variable} ${cairo.variable} ${spaceGrotesk.variable}`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <ConditionalNavbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
