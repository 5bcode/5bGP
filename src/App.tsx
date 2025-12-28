import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TradeModeProvider } from "@/context/TradeModeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import ItemDetails from "./pages/ItemDetails";
import Scanner from "./pages/Scanner";
import History from "./pages/History";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <TradeModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/item/:id" element={<ItemDetails />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/history" element={<History />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TradeModeProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;