import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: {
    children: "Active",
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Planned</Badge>
      <Badge variant="outline">Paused</Badge>
      <Badge variant="destructive">Blocked</Badge>
      <Badge variant="ghost">Draft</Badge>
      <Badge variant="link">View activity</Badge>
    </div>
  ),
};
