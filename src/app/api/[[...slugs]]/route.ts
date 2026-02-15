/**
 * Next.js App Router catch-all route — wires Elysia into Next.js.
 * All /api/* requests are handled by the Elysia server.
 */

import { app } from "@/server/elysia-app";

export const GET = app.fetch;
export const POST = app.fetch;
