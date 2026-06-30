import type { AppType } from "@drama-me/backend/src/app";
import { hc } from "hono/client";

export const HttpClient = hc<AppType>("");
