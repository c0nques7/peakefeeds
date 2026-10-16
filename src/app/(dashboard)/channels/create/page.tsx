import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from 'next/navigation';
import CreateChannelForm from '@/components/channels/create-channel-form';
import { PageHeader } from '@/components/ui';

export default async function CreateChannelPage() {
  const session = await getServerSession(authOptions);

  // Only logged-in users can create channels
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="New channel"
        description="Start a space for verified discussion. You'll be its moderator."
      />
      <CreateChannelForm />
    </div>
  );
}
