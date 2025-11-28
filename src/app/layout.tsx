import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// 👇 Import the wrapper we created for next-themes
import { ThemeProvider } from '@/components/ThemeProvider'
// Keep ClientLayout if it handles auth/sessions, otherwise it might be redundant
import ClientLayout from '@/components/ClientLayout' 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PeakeFeeds',
  description: 'The Truth Engine.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* suppressHydrationWarning is vital for next-themes */
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 👇 THEME PROVIDER MUST WRAP EVERYTHING */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Keep your ClientLayout if it provides SessionProvider */}
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}

