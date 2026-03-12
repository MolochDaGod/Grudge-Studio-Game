import { Link } from "wouter";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { Skull } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="max-w-md w-full text-center relative z-10">
        <Skull className="w-32 h-32 text-muted-foreground mx-auto mb-6 opacity-50" />
        <h1 className="text-6xl font-display font-black text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-display text-foreground mb-6 uppercase tracking-widest">Lost in the Void</h2>
        <p className="text-muted-foreground font-serif italic mb-8">
          The path you seek does not exist in this realm. Turn back before the darkness consumes you.
        </p>
        <Link href="/">
          <FantasyButton size="lg">Return to the Light</FantasyButton>
        </Link>
      </div>
    </div>
  );
}
