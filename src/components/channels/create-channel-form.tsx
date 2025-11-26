'use client'

import { useActionState } from 'react'; // React 19 Hook
import { createChannel, CreateChannelState } from '@/actions/create-channel';
// Assuming you have a Button component, if not use standard <button>
// import { Button } from '@/components/ui/button'; 

const initialState: CreateChannelState = {
  message: null,
  errors: {}
};

export default function CreateChannelForm() {
  const [state, action, isPending] = useActionState(createChannel, initialState);

  return (
    <form action={action} className="max-w-md mx-auto space-y-6 p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
      <h2 className="text-xl font-bold text-white mb-4">Create a Community</h2>

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
          Channel Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Crypto News"
          className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        />
        {state.errors?.name && (
          <p className="text-red-400 text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      {/* Description Input */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        />
      </div>

      {/* Tags Input */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-300">
          Tags (comma separated)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="tech, web3, verification"
          className="mt-1 block w-full rounded-md bg-gray-900 border-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        />
      </div>

      {/* Error Message Global */}
      {state.message && (
        <div className="p-3 rounded bg-red-900/50 text-red-200 text-sm">
          {state.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Creating...' : 'Create Channel'}
      </button>
    </form>
  );
}

