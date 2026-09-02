"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type ProjectUrlUpdates = Record<string, string | null>;

export function useProjectUrl() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentQuery = searchParams.toString();

  const updateProjectUrl = useCallback(
    (updates: ProjectUrlUpdates) => {
      const params = new URLSearchParams(currentQuery);

      for (const [name, value] of Object.entries(updates)) {
        if (value) {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      }

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [currentQuery, pathname, router],
  );

  return { isPending, updateProjectUrl };
}
