import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Allowed frontend origins, comma-separated (e.g. the admin-app, donor-app,
// and hospital-app Render domains). If unset, CORS allows any origin —
// safe because auth uses Bearer tokens, not cookies, but an explicit
// allowlist is recommended in production.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors(
    allowedOrigins?.length
      ? {
          origin: allowedOrigins,
        }
      : undefined,
  ),
);
// Default 100kb limit is too small for the base64-encoded license PDF
// (300KB file -> ~400KB base64). 1mb gives headroom without opening the
// door to arbitrarily large request bodies.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

export default app;
