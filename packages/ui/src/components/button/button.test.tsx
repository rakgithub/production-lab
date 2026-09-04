import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { Button } from "./button";

it("handles clicks and prevents interaction when disabled", async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(
    <>
      <Button onClick={handleClick}>Save changes</Button>
      <Button disabled onClick={handleClick}>
        Delete project
      </Button>
    </>,
  );

  await user.click(screen.getByRole("button", { name: "Save changes" }));

  expect(handleClick).toHaveBeenCalledOnce();

  const disabledButton = screen.getByRole("button", {
    name: "Delete project",
  });

  expect(disabledButton).toBeDisabled();
  await user.click(disabledButton);
  expect(handleClick).toHaveBeenCalledOnce();
});
