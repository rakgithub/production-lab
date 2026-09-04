import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("combines conditional classes and keeps the latest Tailwind utility", () => {
    expect(
      cn("rounded-md px-2", "px-4", {
        "text-primary": true,
        "opacity-50": false,
      }),
    ).toBe("rounded-md px-4 text-primary");
  });
});
