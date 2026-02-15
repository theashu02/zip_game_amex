"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import ZipGrid from "@/components/game/ZipGrid";
import GameHeader from "@/components/game/GameHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, CheckCircle2, Loader2, Copy } from "lucide-react";
import type { Puzzle } from "@/engine/types";

// Temporarily defining types here to avoid import issues from server file used in client
interface ClientRoomPlayer {
  id: string;
  name: string;
  currentLevel: number;
  finished: boolean;
  finishTime?: number;
}

interface ClientRoom {
  id: string;
  hostId: string;
  levels: Puzzle[];
  players: ClientRoomPlayer[];
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  startedAt?: number;
}

const pageBg = "min-h-screen w-full"; // Background handled by globals.css

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.id as string;
  const playerId = searchParams.get("playerId");

  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Polling
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (res.status === 404) {
          setError("Room not found");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch room");
        const data = await res.json();
        setRoom(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [roomId]);

  const myPlayer = useMemo(() => {
    return room?.players.find((p) => p.id === playerId);
  }, [room, playerId]);

  const startGame = async () => {
    if (!room || !myPlayer) return;
    try {
      await fetch(`/api/room/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: myPlayer.id }),
      });
      // Polling will catch the status change
    } catch (err) {
      console.error(err);
      alert("Failed to start game");
    }
  };

  const handleLevelComplete = useCallback(async () => {
    if (!room || !myPlayer) return;

    try {
      await fetch(`/api/room/${roomId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myPlayer.id,
          levelIndex: myPlayer.currentLevel,
        }),
      });
    } catch (err) {
      console.error("Failed to submit progress", err);
    }
  }, [room, myPlayer, roomId]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (error) {
    return (
      <main className={`${pageBg} flex items-center justify-center`}>
        <div className="text-center bg-white/80 p-8 rounded-3xl backdrop-blur-md shadow-xl">
          <h1 className="text-2xl font-bold mb-4 text-slate-800">Error</h1>
          <p className="text-slate-600">{error}</p>
          <Button className="mt-4 bg-sky-500 text-white hover:bg-sky-600" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </main>
    );
  }

  if (!room || !myPlayer) {
    return (
      <main className={`${pageBg} flex items-center justify-center`}>
        <div className="bg-white/50 p-6 rounded-full backdrop-blur-md shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </main>
    );
  }

  // --- LOBBY VIEW ---
  if (room.status === "waiting") {
    const isHost = room.hostId === myPlayer.id;

    return (
      <main className={`${pageBg} px-4 py-10 flex flex-col items-center justify-center gap-6`}>
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-xl border-white/20 dark:bg-slate-900/80 dark:border-slate-800">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Lobby</CardTitle>
            <CardDescription>Waiting for players to join...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50/80 border border-slate-100 p-6 dark:bg-slate-800/50 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room Code</span>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-mono font-black tracking-widest text-slate-800 dark:text-slate-100">{room.id}</span>
                <Button size="icon" variant="ghost" onClick={copyCode} className="hover:bg-slate-200 dark:hover:bg-slate-700">
                  {isCopied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-slate-400" />}
                </Button>
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-400/80">Share with friends</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Players ({room.players.length})</h3>
              <div className="space-y-2">
                {room.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 bg-white/60 dark:bg-slate-950/50 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-sm">{p.name.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {p.name} {p.id === myPlayer.id && <span className="opacity-50 text-sm font-normal">(You)</span>}
                      </span>
                    </div>
                    {p.id === room.hostId && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-yellow-200">HOST</span>}
                  </div>
                ))}
              </div>
            </div>

            {isHost ? (
              <Button className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 border-0" onClick={startGame}>
                Start Game
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-slate-500 animate-pulse py-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Waiting for start...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // --- PLAYING/FINISHED VIEW ---

  const leaderboard = [...room.players].sort((a, b) => {
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.currentLevel - a.currentLevel;
  });

  if (room.status === "finished" || myPlayer.finished) {
    return (
      <main className={`${pageBg} px-4 py-8 flex flex-col items-center justify-center min-h-screen`}>
        <div className="w-full max-w-4xl grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900 dark:to-amber-900 mb-6 shadow-xl shadow-yellow-500/20">
                <Trophy className="h-12 w-12 text-yellow-600 dark:text-yellow-400 drop-shadow-sm" />
              </div>
              <h1 className="text-5xl font-black text-slate-800 dark:text-white drop-shadow-sm">{room.status === "finished" ? "Game Over!" : "Finished!"}</h1>
              <p className="text-slate-500 font-medium">{room.status === "finished" ? "Final Standings" : "Waiting for others..."}</p>
            </div>

            <Card className="w-full bg-white/80 backdrop-blur-md border-white/20 shadow-xl dark:bg-slate-900/80 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((p, i) => {
                    const time = p.finishTime ? ((p.finishTime - room.createdAt) / 1000).toFixed(1) + "s" : "--";
                    const isWinner = i === 0 && p.finished;
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isWinner ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" : "bg-white/50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700"}`}>
                        <div className="flex items-center gap-4">
                          <span className={`text-xl font-bold w-8 text-center ${i === 0 ? "text-yellow-500" : "text-slate-300"}`}>{i + 1}</span>
                          <div>
                            <p className={`font-bold ${p.id === myPlayer.id ? "text-sky-600 dark:text-sky-400" : "text-slate-700 dark:text-slate-200"}`}>
                              {p.name} {p.id === myPlayer.id && "(You)"}
                            </p>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{p.finished ? "Finished" : `Level ${p.currentLevel + 1}/${room.levels.length}`}</p>
                          </div>
                        </div>
                        <div className={`font-mono font-bold ${p.finished ? "text-slate-900 dark:text-white" : "text-slate-400 italic"}`}>{p.finished ? time : "..."}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="text-slate-500 hover:text-slate-800 bg-white/50 hover:bg-white border-slate-200" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // --- PLAYING VIEW ---
  const currentPuzzle = room.levels[myPlayer.currentLevel];

  return (
    <main className={`${pageBg} px-4 py-8 flex flex-col items-center`}>
      <div className="w-full max-w-6xl flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_300px] items-start">
        {/* MAIN GAME AREA */}
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full flex justify-between items-center max-w-[500px]">
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
              Level {myPlayer.currentLevel + 1} <span className="text-slate-400 text-base font-normal">/ {room.levels.length}</span>
            </h2>
            <div className="text-xs font-bold font-mono bg-white/50 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full backdrop-blur-sm dark:bg-slate-800/50 dark:border-slate-700">Room: {room.id}</div>
          </div>
          {/* Constrain header width to match grid better on large screens, but allow full width on mobile */}
          <div className="w-full max-w-[500px]">
            <GameHeader difficulty={currentPuzzle.difficulty} date={currentPuzzle.date} gridSize={currentPuzzle.size} isComplete={false} startTime={room.startedAt} />
          </div>

          <ZipGrid key={currentPuzzle.id} puzzle={currentPuzzle} onComplete={handleLevelComplete} startTime={room.startedAt} />
        </div>

        {/* SIDEBAR - Now visible on all devices, stacked below on mobile */}
        <div className="w-full max-w-[500px] lg:max-w-none space-y-4 mx-auto lg:mx-0">
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg dark:bg-slate-900/80 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {leaderboard.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${p.finished ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-sky-500 animate-pulse"}`} />
                    <span className={`font-medium ${p.id === myPlayer.id ? "text-sky-600 font-bold dark:text-sky-400" : "text-slate-700 dark:text-slate-300"}`}>{p.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-xs font-bold">{p.finished ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : `${p.currentLevel + 1} / ${room.levels.length}`}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
