import { generatePuzzle } from "@/engine/generator";
import type { Puzzle } from "@/engine/types";

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
}

// In-memory store
const rooms = new Map<string, Room>();

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
      else if (progress > 0.7) difficulty = "hard";

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
    return { room, player };
  },

  startGame(roomId: string, hostPlayerId: string): boolean {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== hostPlayerId) return false;

    room.status = "playing";
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

    return room;
  },
};
