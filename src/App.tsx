import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TradeModeProvider } from "@/context/TradeModeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { PriceMonitorProvider } from "@/context/PriceMonitorContext";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import ItemDetails from "./pages/ItemDetails";
import Scanner from "./pages/Scanner";
import History from "./pages/History";
import Tools from "./pages/Tools";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TradeModeProvider>
          <TooltipProvider>
            <BrowserRouter>
              <PriceMonitorProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/item/:id" element={<ItemDetails />} />
                    <Route path="/scanner" element={<Scanner />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/tools" element={<Tools />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </PriceMonitorProvider>
            </BrowserRouter>
          </TooltipProvider>
        </TradeModeProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;