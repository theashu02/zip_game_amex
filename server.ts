import { createServer, type IncomingMessage } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import { attachRoomHub } from "./src/server/room-hub";
import { app as apiApp } from "./src/server/elysia-app";

const isProdFlag = process.argv.includes("--prod");
const dev = isProdFlag ? false : process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);

const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      if (req.url?.startsWith("/api")) {
        try {
          const body = await readBody(req);
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: body as BodyInit,
          });
          const response = await apiApp.fetch(request);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          const buffer = Buffer.from(await response.arrayBuffer());
          res.end(buffer);
          return;
        } catch (err) {
          console.error("API handler error", err);
          res.statusCode = 500;
          res.end("Internal Server Error");
          return;
        }
      }

      handle(req, res);
    });

    const wss = new WebSocketServer({ noServer: true });
    attachRoomHub(wss);

    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      if (url.pathname === "/ws") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      } else {
        const upgradeHandler = app.getUpgradeHandler();
        upgradeHandler(req, socket, head);
      }
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const method = req.method?.toUpperCase();
  if (!method || method === "GET" || method === "HEAD") return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}
