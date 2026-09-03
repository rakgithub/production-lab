import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "../button";

const meta = {
  title: "Components/Card",
  component: Card,
  args: {
    children: "Card content",
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Project operations</CardTitle>
        <CardDescription>
          A reusable surface for related project information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Four projects need an owner review this week.</p>
      </CardContent>
    </Card>
  ),
};

export const WithActionAndFooter: Story = {
  render: () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Release readiness</CardTitle>
        <CardDescription>Production deployment checklist.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            View
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>All required checks have passed.</p>
      </CardContent>
      <CardFooter>
        <Button>Open release</Button>
      </CardFooter>
    </Card>
  ),
};

export const Compact: Story = {
  args: {
    size: "sm",
    children: <CardContent>Compact information card.</CardContent>,
  },
};
