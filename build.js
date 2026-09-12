const { buildSync } = require("esbuild");
const { execSync } = require("child_process");

// Step 1: Generate TypeScript type definitions
console.log("📝 Generating type definitions...");
try {
  execSync("tsc", { stdio: "inherit" });
  console.log("✅ Type definitions generated");
} catch (error) {
  console.error("❌ Type generation failed");
  process.exit(1);
}

// Step 2: Bundle and minify with esbuild
console.log("📦 Bundling with esbuild...");
buildSync({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "node",
  treeShaking: true,
});

console.log("✅ Build complete (types + bundle)");
