import type { Preview } from '@storybook/react-vite';

import "../src/styles/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Shared design-system theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story, context) => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle(
          "dark",
          context.globals.theme === "dark"
        );
      }

      return Story();
    },
  ],
};

export default preview;
