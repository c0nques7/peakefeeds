import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Providers } from "@/components/Providers"; 
import ClientLayout from '@/components/layout/ClientLayout' 
import { AppToaster } from '@/components/ui/AppToaster'
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

// viewport-fit=cover makes the env(safe-area-inset-*) padding in our CSS take effect on iOS
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
};

// Wallet providers live in the (dashboard) layout, so landing, legal and auth pages ship no
// wallet code and can be served statically
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <ClientLayout>
              {children}
            </ClientLayout>
            <AppToaster />
            <SpeedInsights />
            <Analytics />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}