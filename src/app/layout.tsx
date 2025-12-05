import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers' // 🆕 1. Import headers
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Web3Provider } from "@/components/providers/Web3Provider"; 
import { Providers } from "@/components/Providers"; 
import ClientLayout from '@/components/ClientLayout' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Peake Feeds',
    default: 'Peake Feeds | The Truth Layer', 
  },
  description: 'The first social platform verified by Ethereum. Join the migration to clarity.',
  openGraph: {
    title: 'Peake Feeds | The Truth Layer',
    description: 'The first social platform verified by Ethereum.. Join the migration to clarity.',
    url: 'https://peakefeeds.com',
    siteName: 'Peake Feeds',
    images: [
      {
        url: '/peake-logo-dark.png', 
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

// 🆕 2. Make RootLayout async to await headers()
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 🆕 3. Get cookies for AppKit hydration
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
          {/* 🆕 4. Pass cookies to Web3Provider */}
          <Web3Provider cookies={cookies}>
            <Providers>
              <ClientLayout>
                {children}
              </ClientLayout>
            </Providers>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}