"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const pageBg = "min-h-screen w-full bg-slate-50 text-slate-900";

type ViewState = "name" | "menu";

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("name");

  const [playerName, setPlayerName] = useState("");
  const isNameValid = playerName.trim().length > 0;

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

  if (view === "name") {
    return (
      <main className={`${pageBg} px-4 py-10 flex items-center justify-center`}>
        <Card className="w-full max-w-md border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-sky-700">Welcome to Zip</CardTitle>
            <CardDescription>Enter a name to start.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleNameSubmit}>
              <Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Your name" autoComplete="name" maxLength={24} autoFocus />
              <Button type="submit" disabled={!isNameValid} className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
          <CardFooter>Tip: This name is stored locally.</CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className={`${pageBg} px-4 py-10 flex flex-col items-center justify-center gap-8`}>
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight text-sky-700 lg:text-6xl">Zip</h1>
        <p className="text-slate-500 font-medium">Multiplayer challenges</p>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-sky-600" />
              Multiplayer Room
            </CardTitle>
            <CardDescription>Challenge friends to a race across multiple levels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Create Room</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 hover:border-sky-500 hover:text-sky-700"
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
                  className="flex-1 hover:border-sky-500 hover:text-sky-700"
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
                  className="flex-1 hover:border-sky-500 hover:text-sky-700"
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
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-400">Or join</span>
              </div>
            </div>

            <form onSubmit={joinRoom} className="flex gap-2">
              <Input placeholder="CODE" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="uppercase font-mono text-center tracking-widest" maxLength={6} />
              <Button type="submit" disabled={!roomCode || joiningRoom}>
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <button
        className="text-sm font-medium text-slate-500 hover:text-sky-700 transition-colors"
        onClick={() => {
          window.localStorage.removeItem("zip-player-name");
          setPlayerName("");
          setView("name");
        }}
      >
        Not {playerName}? Change Name
      </button>

      <footer className="mt-8 text-xs font-medium text-slate-400">
        <p>Built with love using Next.js + Elysia</p>
      </footer>
    </main>
  );
}
