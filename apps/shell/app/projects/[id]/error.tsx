"use client";

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

      <button
        type="button"
        onClick={reset}
        className="rounded bg-slate-950 px-4 py-2 text-white"
      >
        Retry
      </button>
    </main>
  );
}