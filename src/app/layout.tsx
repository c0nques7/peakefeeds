import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Web3Provider } from "@/components/providers/Web3Provider"; 
import { Providers } from "@/components/Providers"; // 👈 1. Import the Session Wrapper
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