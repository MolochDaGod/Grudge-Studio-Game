import { useGetLeaderboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { FantasyButton } from "@/components/ui/fantasy-button";
import { Trophy, ArrowLeft, Loader2, Skull } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/use-auth-store";
import { getLeaderboard as getGrudgeLeaderboard } from "@/lib/grudge-api";
import { useQuery } from "@tanstack/react-query";

export default function Leaderboard() {
  const { isAuthenticated } = useAuthStore();

  // Try Grudge backend leaderboard first (when authenticated), fall back to local
  const grudgeLb = useQuery({
    queryKey: ['grudge-leaderboard'],
    queryFn: () => getGrudgeLeaderboard(25),
    enabled: isAuthenticated,
    retry: false,
  });

  const localLb = useGetLeaderboard();

  // Use Grudge backend data if available, otherwise local
  const leaderboard = grudgeLb.data
    ? grudgeLb.data.map((e, i) => ({ id: i, playerName: e.name, score: e.kills * 100, characterUsed: '-', ...e }))
    : localLb.data;
  const isLoading = grudgeLb.isLoading || localLb.isLoading;
  const error = grudgeLb.error && localLb.error;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative">
      {/* Background art */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-10 mix-blend-overlay"
        style={{ backgroundImage: `url('${import.meta.env.BASE_URL}images/battle-bg.png')` }}
      />

      <div className="container mx-auto max-w-4xl relative z-10">
        
        <div className="flex items-center justify-between mb-12">
          <Link href="/">
            <FantasyButton variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Home
            </FantasyButton>
          </Link>
          <div className="flex flex-col items-center">
            <Trophy className="w-12 h-12 text-primary mb-2" />
            <h1 className="text-3xl md:text-5xl font-display font-bold text-glow uppercase">Hall of Heroes</h1>
          </div>
          <div className="w-[100px]" /> {/* Spacer */}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive bg-card border border-destructive/20 p-8">
            <Skull className="w-12 h-12 mx-auto mb-4" />
            <h3 className="font-display text-xl mb-2">The Archives are sealed</h3>
            <p className="text-muted-foreground">Could not retrieve the ancient records.</p>
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur border border-border shadow-2xl overflow-hidden rounded-sm">
            
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-black/60 font-display text-primary tracking-wider text-sm font-bold">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-4">Champion</div>
              <div className="col-span-3 text-right">Score</div>
              <div className="col-span-4 pl-4">Character Used</div>
            </div>

            <div className="divide-y divide-white/5">
              {leaderboard?.map((entry, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={entry.id} 
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                >
                  <div className="col-span-1 text-center font-mono text-muted-foreground">
                    {index === 0 ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto" /> : 
                     index === 1 ? <Trophy className="w-5 h-5 text-gray-400 mx-auto" /> :
                     index === 2 ? <Trophy className="w-5 h-5 text-orange-700 mx-auto" /> : 
                     `#${index + 1}`}
                  </div>
                  <div className="col-span-4 font-bold text-foreground truncate">
                    {entry.playerName}
                  </div>
                  <div className="col-span-3 text-right font-mono text-primary font-bold">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="col-span-4 pl-4 text-sm text-muted-foreground truncate italic border-l border-white/10">
                    {entry.characterUsed}
                  </div>
                </motion.div>
              ))}
              
              {(!leaderboard || leaderboard.length === 0) && (
                <div className="p-12 text-center text-muted-foreground italic">
                  No records exist yet. Be the first to forge your legacy!
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
