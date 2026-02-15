"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const pageBg = "min-h-screen w-full"; // Background handled by globals.css

type ViewState = "name" | "menu"; // Removed 'daily'

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("name");

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

  // Use "menu" as the main waiting lobby view
  return (
    <main className={`${pageBg} px-4 py-10 flex flex-col items-center justify-center gap-8`}>
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black tracking-tight lg:text-6xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">Zip</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Multiplayer challenges</p>
      </div>

      <div className="w-full max-w-md">
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

      <footer className="mt-8 text-xs font-medium text-slate-400/50">
        <p>Built with love using Next.js + Elysia</p>
      </footer>
    </main>
  );
}
