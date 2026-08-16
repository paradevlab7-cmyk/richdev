import { createRequire } from "node:module";

// `runtimeApp.cjs` is generated before Vercel traces functions, so this shared
// adapter keeps server dependencies available to every explicit API endpoint.
const require = createRequire(import.meta.url);
const { createRuntimeApp } = require("./runtimeApp.cjs") as typeof import("../server/runtimeApp");

export default createRuntimeApp("vercel");
