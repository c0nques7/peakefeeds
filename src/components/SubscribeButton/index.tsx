'use client'

import { useActionState } from 'react';
import { toggleSubscription, SubscribeState } from '@/actions/subscribe'; 
import { Check, Plus } from 'lucide-react';

interface SubscribeButtonProps {
    channelId: string;
    channelSlug: string;
    isSubscribedInitial: boolean; // Initial state passed from Server Component
}

export function SubscribeButton({ channelId, channelSlug, isSubscribedInitial }: SubscribeButtonProps) {
    
    const [actionState, action, isPending] = useActionState(toggleSubscription, {} as SubscribeState);
    
    // Determine current UI state: Use the server-provided initial state, 
    // or optimistically update if the action just completed.
    const isSubscribed = actionState.message === 'subscribed' 
                       ? true 
                       : actionState.message === 'unsubscribed' 
                       ? false 
                       : isSubscribedInitial;

    const buttonText = isSubscribed ? 'Subscribed' : 'Subscribe';
    const buttonIcon = isSubscribed ? <Check size={18} /> : <Plus size={18} />;

    return (
        <form action={action}>
            <input type="hidden" name="channelId" value={channelId} />
            <input type="hidden" name="channelSlug" value={channelSlug} />

            <button 
                type="submit"
                disabled={isPending}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 
                    ${isSubscribed 
                        ? 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                        : 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-500'
                    }
                    disabled:opacity-50
                `}
            >
                {isPending ? 'Updating...' : <>{buttonIcon} {buttonText}</>}
            </button>
        </form>
    );
}