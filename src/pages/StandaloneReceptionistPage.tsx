import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceptionistPage } from "./ReceptionistPage";

export function StandaloneReceptionistPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <img src="/favicon-192.png" alt="ProWorx" className="size-8 rounded-lg" />
          <span className="font-semibold text-lg">ProWorx Receptionist</span>
        </div>
      </header>

      {/* Receptionist tool — standalone mode */}
      <div className="flex-1">
        <ReceptionistPage standalone />
      </div>
    </div>
  );
}
