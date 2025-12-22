'use client'

import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { blockUser } from '@/actions/block-user';
import { toast } from 'sonner';

interface BlockUserButtonProps {
    userId: string;
}

export default function BlockUserButton({ userId }: BlockUserButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleBlock = async () => {
        if (!confirm("Are you sure you want to block this user? They will not be able to message you.")) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('userIdToBlock', userId);

        try {
            const result = await blockUser({}, formData);
            if (result.success) {
                toast.success(result.message);
                // Optional: Redirect or update UI state
                window.location.reload(); 
            } else {
                toast.error(result.message || "Failed to block user.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button 
            onClick={handleBlock}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-sm font-medium text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            title="Block User"
        >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            <span>Block</span>
        </button>
    );
}
