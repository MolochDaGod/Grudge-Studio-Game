import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
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
      <Route path="/" component={Home} />
      <Route path="/select" component={CharacterSelect} />
      <Route path="/level-select" component={LevelSelect} />
      <Route path="/skill-tree" component={SkillTree} />
      <Route path="/battle" component={Battle} />
      <Route path="/result" component={Result} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/toonadmin" component={ToonAdmin} />
      <Route path="/map-editor/:levelId" component={MapEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
