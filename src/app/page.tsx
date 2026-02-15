"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ZipGrid from "@/components/game/ZipGrid";
import GameHeader from "@/components/game/GameHeader";
import HowToPlay from "@/components/game/HowToPlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Puzzle, Cell } from "@/engine/types";
import { Play, Users } from "lucide-react";

const pageBg = "min-h-screen w-full"; // Background handled by globals.css

type ViewState = "name" | "menu" | "daily";

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("name");

  // Daily Game State
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User State
  const [playerName, setPlayerName] = useState("");
  const isNameValid = playerName.trim().length > 0;

  // Room State
  const [roomCode, setRoomCode] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  useEffect(() => {
    const savedName = window.localStorage.getItem("zip-player-name");
    if (savedName) {
      setPlayerName(savedName);
      setView("menu");
    }
  }, []);

  const handleNameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = playerName.trim();
      if (!trimmed) return;
      window.localStorage.setItem("zip-player-name", trimmed);
      setPlayerName(trimmed);
      setView("menu");
    },
    [playerName],
  );

  const startDailyGame = async () => {
    setView("daily");
    setLoading(true);
    try {
      const res = await fetch("/api/puzzle/daily");
      if (!res.ok) throw new Error("Failed to fetch puzzle");
      const data = await res.json();
      setPuzzle(data);
    } catch (err) {
      setError("Could not load today's puzzle. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (levelCount: 3 | 5 | 10) => {
    setCreatingRoom(true);
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: playerName, levelCount }),
      });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      // Redirect with playerId
      router.push(`/room/${data.room.id}?playerId=${data.player.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  };

  const joinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomCode) return;
    setJoiningRoom(true);
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomCode.toUpperCase(), playerName }),
      });
      if (!res.ok) throw new Error("Room not found");
      const data = await res.json();
      router.push(`/room/${data.room.id}?playerId=${data.player.id}`);
    } catch (err) {
      console.error(err);
      alert("Room not found or game started");
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleComplete = useCallback(
    async (path: Cell[], timeMs: number) => {
      setIsComplete(true);

      try {
        const name = playerName.trim() || "Player";
        await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            timeMs,
            path,
          }),
        });
      } catch {
        // Silently fail - leaderboard is optional
      }
    },
    [playerName],
  );

  // --- VIEWS ---

  if (view === "name") {
    return (
      <main className={`${pageBg} px-4 py-10 flex items-center justify-center`}>
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-xl border-white/20 dark:bg-slate-900/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">Welcome to Zip</CardTitle>
            <CardDescription>Enter a name for the leaderboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleNameSubmit}>
              <Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Your name" autoComplete="name" maxLength={24} autoFocus className="bg-white/50 border-slate-200 focus:border-sky-500 transition-colors" />
              <Button type="submit" disabled={!isNameValid} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/20 text-white border-0">
                Continue
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-xs text-slate-400">Tip: This name is stored locally.</CardFooter>
        </Card>
      </main>
    );
  }

  if (view === "menu") {
    return (
      <main className={`${pageBg} px-4 py-10 flex flex-col items-center justify-center gap-8`}>
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight lg:text-6xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">Zip</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Daily puzzles & Multiplayer challenges</p>
        </div>

        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
          {/* DAILY CARD */}
          <Card className="group hover:border-sky-500 transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-md shadow-lg hover:shadow-sky-500/10 border-white/20 dark:bg-slate-900/80 dark:border-slate-800" onClick={startDailyGame}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 group-hover:text-sky-600 transition-colors">
                <Play className="h-5 w-5 text-sky-500" />
                Daily Challenge
              </CardTitle>
              <CardDescription>Solve today&apos;s puzzle and compete on the global leaderboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:scale-[1.02] transition-transform">
                <span className="text-5xl drop-shadow-md pb-2">📅</span>
              </div>
            </CardContent>
          </Card>

          {/* MULTIPLAYER CARD */}
          <Card className="bg-white/80 backdrop-blur-md shadow-lg border-white/20 dark:bg-slate-900/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Users className="h-5 w-5 text-indigo-500" />
                Multiplayer Room
              </CardTitle>
              <CardDescription>Challenge friends to a race across multiple levels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Create Room</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      createRoom(3);
                    }}
                    disabled={creatingRoom}
                  >
                    3 Lvls
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      createRoom(5);
                    }}
                    disabled={creatingRoom}
                  >
                    5 Lvls
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      createRoom(10);
                    }}
                    disabled={creatingRoom}
                  >
                    10 Lvls
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/50 px-2 text-slate-400 backdrop-blur-sm rounded-full">Or join</span>
                </div>
              </div>

              <form onSubmit={joinRoom} className="flex gap-2">
                <Input placeholder="CODE" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="uppercase font-mono text-center tracking-widest bg-white/50 border-slate-200 focus:border-indigo-500 transition-colors" maxLength={6} />
                <Button type="submit" disabled={!roomCode || joiningRoom} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
                  Join
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <button
          className="text-sm font-medium text-slate-400 hover:text-sky-600 transition-colors"
          onClick={() => {
            window.localStorage.removeItem("zip-player-name");
            setPlayerName("");
            setView("name");
          }}
        >
          Not {playerName}? Change Name
        </button>
      </main>
    );
  }

  // DAILY GAME VIEW
  if (loading) {
    return (
      <main className={`${pageBg} px-4 py-10 flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-5 bg-white/50 p-8 rounded-3xl backdrop-blur-md">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading today&apos;s puzzle...</p>
        </div>
      </main>
    );
  }

  if (error || !puzzle) {
    return (
      <main className={`${pageBg} px-4 py-10 flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-6 text-center bg-white/80 p-8 rounded-3xl backdrop-blur-md shadow-xl max-w-sm">
          <span className="text-5xl">🫠</span>
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">{error || "Something went wrong"}</p>
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={startDailyGame} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
              Try Again
            </Button>
            <Button variant="ghost" onClick={() => setView("menu")} className="w-full">
              Back to Menu
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${pageBg} px-4 py-8 flex flex-col items-center justify-center gap-6`}>
      <GameHeader difficulty={puzzle.difficulty} date={puzzle.date} gridSize={puzzle.size} isComplete={isComplete} />
      <ZipGrid puzzle={puzzle} onComplete={handleComplete} />
      <HowToPlay />

      <Button variant="ghost" className="mt-8 text-slate-400 hover:text-sky-600" onClick={() => setView("menu")}>
        Back to Menu
      </Button>

      <footer className="mt-4 text-xs font-medium text-slate-400/50">
        <p>Built with love using Next.js + Elysia</p>
      </footer>
    </main>
  );
}
