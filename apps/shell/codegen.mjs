/** @type {import("@graphql-codegen/cli").CodegenConfig} */
const config = {
  schema: "../api/src/transport/graphql/schema/*.graphql",
  documents: "features/**/*.graphql",
  generates: {
    "./lib/graphql/generated/": {
      preset: "client",
      config: {
        documentMode: "string",
        enumsAsTypes: true,
        scalars: {
          DateTime: "string",
        },
        strictScalars: true,
        useTypeImports: true,
      },
    },
  },
  ignoreNoDocuments: false,
};

export default config;
