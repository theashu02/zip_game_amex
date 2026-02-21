import { WebSocketServer, WebSocket } from "ws";
import { RoomManager, toRoomSummary } from "./room-manager";

type AliveWebSocket = WebSocket & { isAlive?: boolean };
type RoomUpdateMessage = { type: "room:update"; room: ReturnType<typeof toRoomSummary> };
type ErrorMessage = { type: "error"; error: string };

const roomClients = new Map<string, Set<WebSocket>>();
let heartbeatTimer: NodeJS.Timeout | null = null;

function sendJson(ws: WebSocket, payload: RoomUpdateMessage | ErrorMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function registerClient(roomId: string, ws: WebSocket) {
  let clients = roomClients.get(roomId);
  if (!clients) {
    clients = new Set<WebSocket>();
    roomClients.set(roomId, clients);
  }
  clients.add(ws);
}

function removeClient(roomId: string, ws: WebSocket) {
  const clients = roomClients.get(roomId);
  if (!clients) return;
  clients.delete(ws);
  if (clients.size === 0) {
    roomClients.delete(roomId);
  }
}

export function broadcastRoomUpdate(roomId: string) {
  const room = RoomManager.getRoom(roomId);
  if (!room) return;

  const clients = roomClients.get(roomId);
  if (!clients || clients.size === 0) return;

  const message: RoomUpdateMessage = { type: "room:update", room: toRoomSummary(room) };
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function startHeartbeat(wss: WebSocketServer) {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const ws of wss.clients) {
      const socket = ws as AliveWebSocket;
      if (socket.isAlive === false) {
        ws.terminate();
        continue;
      }
      socket.isAlive = false;
      ws.ping();
    }
  }, 30_000);
}

export function attachRoomHub(wss: WebSocketServer) {
  startHeartbeat(wss);

  RoomManager.onRoomUpdated((room) => {
    broadcastRoomUpdate(room.id);
  });

  wss.on("connection", (ws, req) => {
    const socket = ws as AliveWebSocket;
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    const requestUrl = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    const roomId = requestUrl.searchParams.get("roomId");

    if (!roomId) {
      sendJson(ws, { type: "error", error: "roomId is required" });
      ws.close(1008, "roomId is required");
      return;
    }

    const room = RoomManager.getRoom(roomId);
    if (!room) {
      sendJson(ws, { type: "error", error: "Room not found" });
      ws.close(1008, "Room not found");
      return;
    }

    registerClient(roomId, ws);
    sendJson(ws, { type: "room:update", room: toRoomSummary(room) });

    ws.on("close", () => {
      removeClient(roomId, ws);
    });
  });

  wss.on("close", () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });
}
