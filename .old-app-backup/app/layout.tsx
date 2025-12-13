import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers' 
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Web3Provider } from "@/components/providers/Web3Provider"; 
import { Providers } from "@/components/Providers"; 
import ClientLayout from '@/components/layout/ClientLayout' 
// 🆕 1. Import the Support Context Provider
import { SupportProvider } from '@/context/SupportContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  // 🆕 FIXED: Set the base URL for all relative links
  metadataBase: new URL('https://peakefeeds.com'), 

  title: {
    template: '%s | Peake Feeds',
    default: 'Peake Feeds | The Truth Layer', 
  },
  description: 'The first social platform verified by Ethereum. Join the migration to clarity.',
  openGraph: {
    title: 'Peake Feeds | The Truth Layer',
    description: 'The first social platform verified by Ethereum. Join the migration to clarity.',
    url: 'https://peakefeeds.com',
    siteName: 'Peake Feeds',
    images: [
      {
        url: '/peake-logo-dark.png', // Next.js now knows to prepend metadataBase here
        width: 1200,
        height: 630,
        alt: 'Peake Feeds - The Truth Layer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peake Feeds',
    description: 'Verified by Ethereum. Immutable truth.',
    images: ['/peake-logo-dark.png'], 
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider cookies={cookies}>
            <Providers>
              {/* 🆕 2. WRAP EVERYTHING HERE */}
              <SupportProvider>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </SupportProvider>
            </Providers>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}