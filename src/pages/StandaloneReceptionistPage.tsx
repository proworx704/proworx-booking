import { Headphones, Lock, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceptionistPage } from "./ReceptionistPage";

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

const ACCESS_PIN = "proworx2026";
const PIN_STORAGE_KEY = "proworx-reception-pin";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ACCESS_PIN) {
      sessionStorage.setItem(PIN_STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto size-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-3">
            <Headphones className="size-8 text-white" />
          </div>
          <CardTitle className="text-xl">ProWorx Receptionist</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter access code to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Access Code</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter code"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(false);
                  }}
                  className="pl-10"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">Incorrect access code</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!pin}
            >
              Open Receptionist Tool
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Standalone Layout ────────────────────────────────────────────────────────

function StandaloneLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon-192.png" alt="ProWorx" className="size-8 rounded-lg" />
            <span className="font-semibold text-lg">ProWorx Receptionist</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
            <LogOut className="size-4" />
            Exit
          </Button>
        </div>
      </header>

      {/* Receptionist tool — standalone mode */}
      <div className="flex-1">
        <ReceptionistPage standalone />
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function StandaloneReceptionistPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(PIN_STORAGE_KEY) === "1",
  );

  const handleLogout = () => {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    setUnlocked(false);
  };

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return <StandaloneLayout onLogout={handleLogout} />;
}
