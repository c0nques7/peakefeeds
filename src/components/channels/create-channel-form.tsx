'use client'

import { useActionState } from 'react';
import { createChannel, CreateChannelState } from '@/actions/create-channel';
import { Button, Card, TextField, TextAreaField } from '@/components/ui';

const initialState: CreateChannelState = {
  message: null,
  errors: {}
};

export default function CreateChannelForm() {
  const [state, action, isPending] = useActionState(createChannel, initialState);

  return (
    <Card>
      <form action={action} className="flex flex-col gap-5">
        <TextField
          id="name"
          name="name"
          label="Channel name"
          placeholder="e.g. Crypto News"
          hint="3 to 30 characters: letters, numbers and spaces."
          error={state.errors?.name?.[0]}
          required
        />

        <TextAreaField
          id="description"
          name="description"
          label="Description"
          rows={3}
          hint="What the channel is for. Shown at the top of the channel."
          error={state.errors?.description?.[0]}
        />

        <TextField
          id="tags"
          name="tags"
          label="Tags"
          placeholder="tech, web3, verification"
          hint="Separate tags with commas."
        />

        {state.message && (
          <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={isPending} fullWidth size="lg">
          {isPending ? 'Creating…' : 'Create channel'}
        </Button>
      </form>
    </Card>
  );
}
