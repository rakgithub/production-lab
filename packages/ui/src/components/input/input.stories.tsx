import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: {
    placeholder: "Enter a value",
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    defaultValue: "Production dashboard",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Unavailable",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    "aria-label": "Invalid project name",
    defaultValue: "Invalid value",
  },
};

export const File: Story = {
  args: {
    type: "file",
    "aria-label": "Upload a file",
  },
};
