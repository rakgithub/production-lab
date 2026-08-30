import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-12">
      <h1 className="text-2xl font-semibold">
        Project not found
      </h1>

      <p>The requested project does not exist.</p>

      <Link href="/projects" className="underline">
        Return to projects
      </Link>
    </main>
  );
}