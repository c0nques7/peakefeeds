import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; // Pointing to your v4 config
import { redirect } from 'next/navigation';
import CreateChannelForm from '@/components/channels/create-channel-form';

export default async function CreateChannelPage() {

  const session = await getServerSession(authOptions);

  // 🔒 Security: Only logged-in users can create channels
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/channels/create');
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Start a Community
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Create a space for verified discussion. You will automatically become the moderator.
        </p>
      </div>

      <CreateChannelForm />
    </div>
  );
}

