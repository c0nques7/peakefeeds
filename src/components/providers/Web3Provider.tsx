'use client'

import { ReactNode } from 'react'
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter } from '@/lib/wagmi.config' 

// TanStack Query is required by Wagmi
const queryClient = new QueryClient()

export function Web3Provider({ children, cookies }: { children: ReactNode; cookies?: string | null }) {
  // 1. Hydrate the state from server cookies (Prevents flash of disconnected state)
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}