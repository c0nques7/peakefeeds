import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers' 
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Web3Provider } from "@/components/providers/Web3Provider"; 
import { Providers } from "@/components/Providers"; 
import ClientLayout from '@/components/layout/ClientLayout' 
import { SupportProvider } from '@/context/SupportContext'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://peakefeeds.com'), 
  title: {
    template: '%s | Peake Feeds',
    default: 'Peake Feeds | The Truth Layer', 
  },
  description: 'The first social platform verified by Ethereum.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Await headers to ensure we don't block rendering improperly
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
              <SupportProvider>
                </ClientLayout>
                <SpeedInsights />
                <Analytics />
              </SupportProvider>
            </Providers>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}