import { generatePuzzle } from "../engine/generator";
import type { Puzzle } from "../engine/types";

export interface RoomPlayer {
  id: string;
  name: string;
  currentLevel: number; // 0-based index
  finished: boolean;
  finishTime?: number; // ms
}

export interface Room {
  id: string;
  hostId: string;
  levels: Puzzle[];
  players: RoomPlayer[];
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  startedAt?: number;
}

export interface RoomSummary {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  startedAt?: number;
  levelCount: number;
}

export function toRoomSummary(room: Room): RoomSummary {
  return {
    id: room.id,
    hostId: room.hostId,
    players: room.players.map((player) => ({ ...player })),
    status: room.status,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    levelCount: room.levels.length,
  };
}

type RoomListener = (room: Room) => void;
type RoomStore = {
  rooms: Map<string, Room>;
  listeners: Set<RoomListener>;
};

const globalForRooms = globalThis as typeof globalThis & {
  __zipRoomStore?: RoomStore;
};

const roomStore: RoomStore =
  globalForRooms.__zipRoomStore ??
  (globalForRooms.__zipRoomStore = {
    rooms: new Map<string, Room>(),
    listeners: new Set<RoomListener>(),
  });

// In-memory store (shared across module instances in dev)
const rooms = roomStore.rooms;
const roomListeners = roomStore.listeners;

function emitRoomUpdate(room: Room) {
  for (const listener of roomListeners) {
    listener(room);
  }
}

// Helper to generate a short 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  // Simple retry loop to avoid collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!rooms.has(code)) return code;
  }
  return code; // Fallback
}

export const RoomManager = {
  onRoomUpdated(listener: RoomListener) {
    roomListeners.add(listener);
    return () => roomListeners.delete(listener);
  },

  createRoom(hostName: string, levelCount: 3 | 5 | 10): { room: Room; player: RoomPlayer } {
    const roomId = generateRoomCode();

    // Generate unique puzzles for this room
    const levels: Puzzle[] = [];
    for (let i = 0; i < levelCount; i++) {
      // Difficulty curve: 1st/2nd easy, middle medium, last hard
      // For 3 levels: E, M, H
      // For 5: E, E, M, M, H
      // For 10: E... M... H...
      let difficulty: "easy" | "medium" | "hard" = "medium";
      const progress = i / levelCount;
      if (progress < 0.3) difficulty = "easy";
      else if (progress >= 0.6) difficulty = "hard";

      const seed = `room-${roomId}-lvl-${i}`;
      const puzzle = generatePuzzle(seed, difficulty);
      levels.push(puzzle);
    }

    const hostPlayer: RoomPlayer = {
      id: crypto.randomUUID(),
      name: hostName,
      currentLevel: 0,
      finished: false,
    };

    const room: Room = {
      id: roomId,
      hostId: hostPlayer.id,
      levels,
      players: [hostPlayer],
      status: "waiting",
      createdAt: Date.now(),
    };

    rooms.set(roomId, room);
    emitRoomUpdate(room);
    return { room, player: hostPlayer };
  },

  getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  },

  joinRoom(roomId: string, playerName: string): { room: Room; player: RoomPlayer } | null {
    const room = rooms.get(roomId);
    if (!room || room.status !== "waiting") return null;

    const player: RoomPlayer = {
      id: crypto.randomUUID(),
      name: playerName,
      currentLevel: 0,
      finished: false,
    };

    room.players.push(player);
    emitRoomUpdate(room);
    return { room, player };
  },

  startGame(roomId: string, hostPlayerId: string): boolean {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== hostPlayerId) return false;

    room.status = "playing";
    room.startedAt = Date.now();
    emitRoomUpdate(room);
    return true;
  },

  submitProgress(roomId: string, playerId: string, levelIndex: number): Room | null {
    const room = rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;

    // Logic: if completing the current level, verify and advance
    // We assume validation happened in `validate` endpoint before calling this?
    // Actually, `elysia-app` should call this only after validation passes.

    // Update progress
    const prevLevel = player.currentLevel;
    const prevStatus = room.status;

    if (levelIndex === player.currentLevel) {
      player.currentLevel += 1;
      if (player.currentLevel >= room.levels.length) {
        player.finished = true;
        player.finishTime = Date.now();
      }
    }

    // Check if whole room finished (all players finished)
    if (room.players.every((p) => p.finished)) {
      room.status = "finished";
    }

    if (player.currentLevel !== prevLevel || room.status !== prevStatus) {
      emitRoomUpdate(room);
    }
    return room;
  },
};
