import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';

// Create a client
const queryClient = new QueryClient();

import { Dashboard } from './pages/Dashboard';
import { ItemDetail } from './pages/ItemDetail';
import { Portfolio } from './pages/Portfolio';
import { Screener } from './pages/Screener';
import { Highlights } from './pages/Highlights';
import { ComparativeAnalysis } from './pages/ComparativeAnalysis';
import { Performance } from './pages/Performance';
import Alerts from './pages/Alerts';

import { usePreferencesStore } from './store/preferencesStore';
import { useEffect } from 'react';

// ... imports

function App() {
  const { theme } = usePreferencesStore();

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('theme-molten', 'theme-midnight', 'theme-runelite');
    // Add current theme class
    if (theme !== 'molten') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/compare" element={<ComparativeAnalysis />} />
            <Route path="/compare/:ids" element={<ComparativeAnalysis />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" theme="dark" richColors />
    </QueryClientProvider>
  );
}

export default App;
