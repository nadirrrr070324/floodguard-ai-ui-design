// Launcher for the shared Express app (see frontend/server/app.js).
// Keeps `npm start` / `npm run dev` at the repo root working, and satisfies
// the render.yaml entrypoint for any Render deployment.
import { app } from "../../frontend/server/app.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[api] Flood Information Portal listening on http://localhost:${PORT}`);
});