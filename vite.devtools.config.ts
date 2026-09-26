import path from "path";
import { defineConfig, normalizePath } from "vite";
import typescriptPlugin from "vite-plugin-typescript";
import dtsBundleGeneratorPlugin from "vite-plugin-dts-bundle-generator";

/** Builds polymatic/devtools and polymatic/devtools-install, next to the main build in dist */
export default defineConfig({
  build: {
    // the main build is in dist too
    emptyOutDir: false,
    lib: {
      entry: {
        "devtools": normalizePath(path.resolve(__dirname, "src", "devtools", "index.ts")),
        "devtools-install": normalizePath(path.resolve(__dirname, "src", "devtools", "install.ts")),
      },
      fileName: (format, entryName) => entryName + (format === "cjs" ? ".cjs" : ".js"),
      formats: ["es", "cjs"],
    },
    minify: false,
    sourcemap: true,
    rollupOptions: {
      // a default and named exports: CommonJS gets both as properties of the module
      output: { exports: "named" },
    },
  },
  plugins: [
    typescriptPlugin({}),
    dtsBundleGeneratorPlugin(
      {
        fileName: (entryName) => entryName + ".d.ts",
        output: { exportReferencedTypes: false },
      },
      // needed with more than one entry
      { preferredConfigPath: path.resolve(__dirname, "tsconfig.json") }
    ),
  ],
});
