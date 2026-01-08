import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TradeModeProvider } from "@/context/TradeModeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { PriceMonitorProvider } from "@/context/PriceMonitorContext";
import { SignalSettingsProvider } from "@/contexts/SignalSettingsContext";
import Layout from "@/components/Layout";
import React, { Suspense } from "react";

// Lazy load route components for code splitting
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const ItemDetails = React.lazy(() => import("./pages/ItemDetails"));
const Scanner = React.lazy(() => import("./pages/Scanner"));
const History = React.lazy(() => import("./pages/History"));
const Tools = React.lazy(() => import("./pages/Tools"));
const Profile = React.lazy(() => import("./pages/Profile"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const LiveSlots = React.lazy(() => import("./pages/LiveSlots"));
import ProtectedRoute from "./components/ProtectedRoute";

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <SignalSettingsProvider>
          <TradeModeProvider>
            <TooltipProvider>
              <BrowserRouter>
                <PriceMonitorProvider>
                  <Suspense fallback={<PageLoader />}>
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
                        <Route path="/slots" element={<LiveSlots />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </PriceMonitorProvider>
              </BrowserRouter>
            </TooltipProvider>
          </TradeModeProvider>
        </SignalSettingsProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;