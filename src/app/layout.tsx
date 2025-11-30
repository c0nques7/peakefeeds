import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Web3Provider } from "@/components/providers/Web3Provider"; 
import { Providers } from "@/components/Providers"; // 👈 1. Import the Session Wrapper
import ClientLayout from '@/components/ClientLayout' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Peake Feeds',
    default: 'Peake Feeds | The Truth Layer', // Default title
  },
  description: 'The first social platform verified by Ethereum. Join the migration to clarity.',
  openGraph: {
    title: 'Peake Feeds | The Truth Layer',
    description: 'The first social platform verified by Ethereum.. Join the migration to clarity.',
    url: 'https://peakefeeds.com',
    siteName: 'Peake Feeds',
    images: [
      {
        url: '/peake-logo-dark.png', // Using the dark logo we added earlier
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 1. Theme Provider (CSS Variables) */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 2. Web3 Provider (Wagmi/Blockchain) */}
          <Web3Provider>
            {/* 3. Session Provider (NextAuth Authentication) */}
            <Providers>
              {/* 4. Client Layout (Mounting Logic) */}
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
