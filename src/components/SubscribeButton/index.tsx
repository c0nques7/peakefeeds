'use client'

import { useState, useTransition } from "react"
import { toggleSubscription } from "../../actions/channel-actions"
import styles from './SubscribeButton.module.css'
import clsx from 'clsx' // Ensure clsx is installed or use template literals

interface SubscribeButtonProps {
  userId: string
  channelId: string
  isSubscribed: boolean
}

export function SubscribeButton({ userId, channelId, isSubscribed: initialState }: SubscribeButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialState)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    setIsSubscribed(!isSubscribed) // Optimistic update

    startTransition(async () => {
      try {
        await toggleSubscription(userId, channelId)
      } catch (error) {
        setIsSubscribed(!isSubscribed) // Revert
        console.error("Failed to toggle")
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={clsx(styles.glassBtn, {
        [styles.active]: isSubscribed,
        [styles.loading]: isPending
      })}
    >
      {isPending ? "..." : isSubscribed ? "Following" : "Subscribe"}
    </button>
  )
}