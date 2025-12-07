import type { Metadata } from 'next';
import { Providers } from './providers';
import { ConditionalNavbar } from '@/components/ConditionalNavbar';
import '@/index.css';

export const metadata: Metadata = {
  title: 'Aqall - AI Website Builder',
  description: 'Build websites with AI in Arabic or English',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body>
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
