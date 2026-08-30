export default function ProjectsLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="h-9 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg bg-slate-200"
          />
        ))}
      </div>
    </main>
  );
}