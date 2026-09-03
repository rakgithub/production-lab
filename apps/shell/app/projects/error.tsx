"use client";

import { Button } from "@repo/ui/components/button";

type ProjectsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectsError({
  reset,
}: ProjectsErrorProps) {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">
        Projects could not be loaded
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
