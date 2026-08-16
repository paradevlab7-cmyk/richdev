import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createRuntimeApp } = require("./runtimeApp.cjs") as typeof import("../server/runtimeApp");

export default createRuntimeApp("vercel");
