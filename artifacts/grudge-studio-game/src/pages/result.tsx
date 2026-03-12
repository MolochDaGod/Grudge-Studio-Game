import { useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/use-game-store";
import { useSubmitScore } from "@workspace/api-client-react";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trophy, Skull, Loader2, RefreshCw, ListOrdered } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Result() {
  const [, setLocation] = useLocation();
  const { battleResult, score, characterUsed, reset } = useGameStore();
  const { mutate: submitScore, isPending } = useSubmitScore();
  const { toast } = useToast();
  
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!battleResult) {
    setLocation("/");
    return null;
  }

  const isWin = battleResult === 'win';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      toast({ title: "Name required", description: "Enter your name for the archives.", variant: "destructive" });
      return;
    }

    submitScore(
      {
        data: {
          playerName: playerName.trim(),
          score: score,
          wins: isWin ? 1 : 0,
          losses: isWin ? 0 : 1,
          characterUsed: characterUsed || "Unknown"
        }
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast({ title: "Score Recorded", description: "Your legacy is written in the archives." });
        },
        onError: () => {
          toast({ title: "Error", description: "The scribes failed to record your score.", variant: "destructive" });
        }
      }
    );
  };

  const handlePlayAgain = () => {
    reset();
    setLocation("/select");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Effect */}
      <div className={`absolute inset-0 opacity-20 ${isWin ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-background to-background' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-destructive/40 via-background to-background'}`} />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border p-8 text-center relative z-10 shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          {isWin ? (
            <Trophy className="w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(218,165,32,0.8)]" />
          ) : (
            <Skull className="w-24 h-24 text-destructive drop-shadow-[0_0_15px_rgba(200,0,0,0.8)]" />
          )}
        </div>

        <h1 className={cn("text-5xl font-display font-black uppercase tracking-widest mb-2", isWin ? "text-glow" : "text-glow-red")}>
          {isWin ? "Victory" : battleResult === 'fled' ? "Cowardice" : "Defeat"}
        </h1>
        
        <p className="text-muted-foreground font-serif italic mb-8">
          {isWin ? "The enemy falls before your might." : battleResult === 'fled' ? "You live to fight another day." : "Your soul joins the cursed fallen."}
        </p>

        <div className="bg-black/50 border border-white/10 p-6 rounded-sm mb-8">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
          <p className="text-4xl font-mono text-white">{score.toLocaleString()}</p>
          <p className="text-xs text-primary mt-2">Squad Leader: {characterUsed}</p>
        </div>

        {!submitted && battleResult !== 'fled' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
            <Input 
              placeholder="Enter your name, Commander" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-black/40 border-border text-center text-lg h-12 focus-visible:ring-primary"
              maxLength={20}
            />
            <FantasyButton type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Record Score"}
            </FantasyButton>
          </form>
        ) : submitted ? (
          <div className="bg-green-900/20 text-green-400 border border-green-900/50 p-4 rounded-sm mb-8">
            Score successfully recorded in the Hall of Heroes!
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-4">
          <FantasyButton variant="secondary" onClick={handlePlayAgain} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" /> Play Again
          </FantasyButton>
          <FantasyButton variant="ghost" onClick={() => setLocation("/leaderboard")} className="flex-1">
            <ListOrdered className="w-4 h-4 mr-2" /> Leaderboard
          </FantasyButton>
        </div>
      </motion.div>
    </div>
  );
}
