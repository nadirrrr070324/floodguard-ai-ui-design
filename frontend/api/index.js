// Vercel serverless entrypoint — serves the whole FloodGuard API.
// The Express app is request/response compatible, so Vercel can call it directly.
import { app } from "../server/app.js";

export const config = { maxDuration: 10 };

export default app;