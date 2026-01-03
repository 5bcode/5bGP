import { useContext } from 'react';
import { PriceMonitorContext } from './PriceMonitorContext';

export const usePriceMonitorContext = () => {
    const context = useContext(PriceMonitorContext);
    if (context === undefined) {
        throw new Error('usePriceMonitorContext must be used within a PriceMonitorProvider');
    }
    return context;
};
