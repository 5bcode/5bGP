import { useState, useEffect } from 'react';

export interface Strategy {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  minRoi: number;
}

const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'default_safe',
    name: 'Safe Flips',
    minPrice: 100,
    maxPrice: 2147000000,
    minVolume: 10000,
    minRoi: 1
  },
  {
    id: 'default_penny',
    name: 'High Vol Penny Stocks',
    minPrice: 1,
    maxPrice: 5000,
    minVolume: 100000,
    minRoi: 5
  },
  {
    id: 'default_high_ticket',
    name: 'High Ticket Items',
    minPrice: 10000000,
    maxPrice: 2147000000,
    minVolume: 10,
    minRoi: 0.5
  }
];

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('customStrategies');
    if (saved) {
      setStrategies(JSON.parse(saved));
    } else {
      setStrategies(DEFAULT_STRATEGIES);
    }
  }, []);

  const saveStrategy = (strategy: Strategy) => {
    const newStrategies = [...strategies, strategy];
    setStrategies(newStrategies);
    localStorage.setItem('customStrategies', JSON.stringify(newStrategies));
  };

  const deleteStrategy = (id: string) => {
    const newStrategies = strategies.filter(s => s.id !== id);
    setStrategies(newStrategies);
    localStorage.setItem('customStrategies', JSON.stringify(newStrategies));
  };

  return { strategies, saveStrategy, deleteStrategy };
}