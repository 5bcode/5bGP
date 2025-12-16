import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';

// Create a client
const queryClient = new QueryClient();

import { Dashboard } from './pages/Dashboard';
import { ItemDetail } from './pages/ItemDetail';
import { Portfolio } from './pages/Portfolio';
import { Screener } from './pages/Screener';
import { Highlights } from './pages/Highlights';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
