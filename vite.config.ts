import path from "path";
import { defineConfig, normalizePath } from "vite";
import rollupLicensePlugin from "rollup-plugin-license";
import typescriptPlugin from "vite-plugin-typescript";
import dtsBundleGeneratorPlugin from "vite-plugin-dts-bundle-generator";

export default defineConfig({
  define: {},
  build: {
    lib: {
      entry: normalizePath(path.resolve(__dirname, "src", "index.ts")),
      name: "polymatic",
      fileName: "polymatic",
      formats: ["es", "umd"],
    },
    minify: false,
    sourcemap: true,
  },
  plugins: [
    rollupLicensePlugin({
      sourcemap: true,
      banner: getLicense(),
    }),
    typescriptPlugin({
    }),
    dtsBundleGeneratorPlugin({
      fileName: "polymatic.d.ts",
    }),
  ],
});

function getLicense() {
  const version = process.env.npm_package_version;
  const year = new Date().getFullYear();
  const license = `
Polymatic v${version ?? "?"}
@copyright Copyright ${year} Ali Shakiba
@license Licensed under the MIT (https://github.com/piqnt/polymatic/blob/main/LICENSE.md)
  `;
  return license;
}
