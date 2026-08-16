import { createRuntimeApp } from "../server/runtimeApp";

// Vercel maps this catch-all function to every /api/* route. The existing
// tRPC, OAuth, storage and cron handlers retain their public URL structure.
const app = createRuntimeApp("vercel");

export default app;
