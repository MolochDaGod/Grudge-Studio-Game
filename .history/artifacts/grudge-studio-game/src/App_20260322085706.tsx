import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import { useEffect } from "react";
import { useAuthStore } from "@/store/use-auth-store";

import Login from "@/pages/login";
import Home from "@/pages/home";
import TeamBuilder from "@/pages/team-builder";
import CharacterSelect from "@/pages/character-select";
import LevelSelect from "@/pages/level-select";
import SkillTree from "@/pages/skill-tree";
import Battle from "@/pages/battle";
import Result from "@/pages/result";
import Leaderboard from "@/pages/leaderboard";
import Admin from "@/pages/admin";
import ToonAdmin from "@/pages/toon-admin";
import MapEditor from "@/pages/map-editor";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">{() => <AuthGuard><Home /></AuthGuard>}</Route>
      <Route path="/teams">{() => <AuthGuard><TeamBuilder /></AuthGuard>}</Route>
      <Route path="/select">{() => <AuthGuard><CharacterSelect /></AuthGuard>}</Route>
      <Route path="/level-select">{() => <AuthGuard><LevelSelect /></AuthGuard>}</Route>
      <Route path="/skill-tree">{() => <AuthGuard><SkillTree /></AuthGuard>}</Route>
      <Route path="/battle">{() => <AuthGuard><Battle /></AuthGuard>}</Route>
      <Route path="/result">{() => <AuthGuard><Result /></AuthGuard>}</Route>
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/toonadmin" component={ToonAdmin} />
      <Route path="/map-editor/:levelId" component={MapEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const restoreSession = useAuthStore(s => s.restoreSession);

  // Attempt to restore existing session on app load
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
