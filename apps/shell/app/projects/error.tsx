"use client";

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