'use client'

import { useCallback } from 'react'
import { useSignMessage } from 'wagmi'
import { getWalletLinkStatus, verifyWalletAddress } from '@/actions/verify-wallet'

type LinkResult = { success: true; alreadyLinked: boolean } | { success: false; error: string }

/**
 * Links a connected wallet to the logged-in account. Asks the wallet for a signature only
 * when the address isn't linked yet, so ownership is proven without prompting on every visit.
 */
export function useLinkWallet() {
  const { signMessageAsync } = useSignMessage()

  return useCallback(async (address: string): Promise<LinkResult> => {
    const status = await getWalletLinkStatus(address)
    if ('error' in status) return { success: false, error: status.error ?? 'Could not link wallet.' }
    if (status.linked) return { success: true, alreadyLinked: true }

    let signature: string
    try {
      signature = await signMessageAsync({ message: status.message })
    } catch {
      return { success: false, error: 'Wallet signature was cancelled.' }
    }

    const formData = new FormData()
    formData.append('address', address)
    formData.append('signature', signature)
    const result = await verifyWalletAddress(formData)
    if ('error' in result) return { success: false, error: result.error ?? 'Could not link wallet.' }
    return { success: true, alreadyLinked: false }
  }, [signMessageAsync])
}
