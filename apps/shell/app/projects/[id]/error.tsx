"use client";

import { Button } from "@repo/ui/components/button";

type ProjectDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectDetailError({
  reset,
}: ProjectDetailErrorProps) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">
        Project could not be loaded
      </h1>

      <p>Please try again.</p>

      <Button
        type="button"
        onClick={reset}
      >
        Retry
      </Button>
    </main>
  );
}
