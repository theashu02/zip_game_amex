/**
 * Eden Treaty client — isomorphic fetch for type-safe API calls.
 * On server: calls Elysia directly without network layer.
 * On client: calls via HTTP.
 */

import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/elysia-app";

export const api = typeof process !== "undefined" ? treaty<App>(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").api : treaty<App>(window.location.origin).api;
