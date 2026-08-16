import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Vercel Function runtime bundle", () => {
  it("build:vercel creates a self-contained server runtime bundle", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(projectRoot, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["build:vercel"]).toContain(
      "esbuild server/runtimeApp.ts --bundle"
    );
    expect(packageJson.scripts["build:vercel"]).toContain(
      "--outfile=api/runtimeApp.cjs"
    );
  });

  it("catch-all entry loads the generated runtime instead of an untraced server path", () => {
    const entry = readFileSync(
      resolve(projectRoot, "api", "[...path].ts"),
      "utf8"
    );

    expect(entry).toContain('require("./runtimeApp.cjs")');
    expect(entry).not.toContain('from "../server/runtimeApp"');
    expect(entry).toContain('createRuntimeApp("vercel")');
  });
});
