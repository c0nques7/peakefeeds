'use client'

import { useActionState } from 'react';
import { toggleSubscription, SubscribeState } from '@/actions/subscribe'; 
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

interface SubscribeButtonProps {
    channelId: string;
    channelSlug: string;
    isSubscribedInitial: boolean; // Initial state passed from Server Component
    small?: boolean;
}

export function SubscribeButton({ channelId, channelSlug, isSubscribedInitial, small = false }: SubscribeButtonProps) {
    
    const [actionState, action, isPending] = useActionState(toggleSubscription, {} as SubscribeState);
    
    // Determine current UI state: Use the server-provided initial state, 
    // or optimistically update if the action just completed.
    const isSubscribed = actionState.message === 'subscribed' 
                       ? true 
                       : actionState.message === 'unsubscribed' 
                       ? false 
                       : isSubscribedInitial;

        const buttonText = isSubscribed ? 'Subscribed' : 'Subscribe';
        const iconSize = small ? 14 : 16;
        const buttonIcon = isSubscribed ? <Check size={iconSize} aria-hidden="true" /> : <Plus size={iconSize} aria-hidden="true" />;

    return (
        <form action={action}>
            <input type="hidden" name="channelId" value={channelId} />
            <input type="hidden" name="channelSlug" value={channelSlug} />

            <Button
                type="submit"
                disabled={isPending}
                size={small ? 'sm' : 'md'}
                variant={isSubscribed ? 'secondary' : 'primary'}
                icon={isPending ? null : buttonIcon}
                aria-pressed={isSubscribed}
            >
                {isPending ? 'Saving…' : buttonText}
            </Button>
        </form>
    );
}