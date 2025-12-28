import React, { useState } from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Briefcase, ArrowRight, CheckCircle2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGP } from '@/lib/osrs-math';
import ItemIcon from './ItemIcon';
import ItemSearch from './ItemSearch';
import { toast } from 'sonner';
import TradeLogDialog, { Trade, InitialTradeValues } from './TradeLogDialog';

export interface ActiveOffer {
  id: string;
  item: Item;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: number;
  targetPrice?: number;
  originalBuyPrice?: number;
}

interface ActiveOffersProps {
  items: Item[];
  prices: Record<string, PriceData>;
  onLogTrade: (trade: Trade) => void;
  offers: ActiveOffer[];
  onAdd: (offer: ActiveOffer) => void;
  onUpdate: (offer: ActiveOffer) => void;
  onRemove: (id: string) => void;
  // Fallback for setOffers if needed, but we prefer specific actions
  setOffers?: React.Dispatch<React.SetStateAction<ActiveOffer[]>>; 
}

const ActiveOffers = ({ items, prices, onLogTrade, offers, onAdd, onUpdate, onRemove }: ActiveOffersProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  
  // Form State
  const [offerType, setOfferType] = useState<'buy'|'sell'>('buy');
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [targetInput, setTargetInput] = useState('');

  // Dialog Control for Completion
  const [completionItem, setCompletionItem] = useState<Item | null>(null);
  const [completionValues, setCompletionValues] = useState<InitialTradeValues | undefined>(undefined);
  const [offerToCompleteId, setOfferToCompleteId] = useState<string | null>(null);

  const handleOpenAdd = () => {
      resetForm();
      setIsAddOpen(true);
  };

  const handleOpenEdit = (offer: ActiveOffer) => {
      setSelectedItem(offer.item);
      setOfferType(offer.type);
      setPriceInput(offer.price.toString());
      setQtyInput(offer.quantity.toString());
      setTargetInput(offer.targetPrice ? offer.targetPrice.toString() : '');
      setEditingOfferId(offer.id);
      setIsAddOpen(true);
  };

  const handleSaveOffer = () => {
    if (!selectedItem || !priceInput || !qtyInput) {
        toast.error("Please fill in all fields");
        return;
    }

    if (editingOfferId) {
        // Edit Mode
        const existing = offers.find(o => o.id === editingOfferId);
        if (existing) {
            onUpdate({
                ...existing,
                item: selectedItem, // Should theoretically match unless we allow changing item
                type: offerType,
                price: parseInt(priceInput),
                quantity: parseInt(qtyInput),
                targetPrice: targetInput ? parseInt(targetInput) : undefined
            });
            toast.success("Offer updated");
        }
    } else {
        // Create Mode
        const newOffer: ActiveOffer = {
            id: crypto.randomUUID(),
            item: selectedItem,
            type: offerType,
            price: parseInt(priceInput),
            quantity: parseInt(qtyInput),
            timestamp: Date.now(),
            targetPrice: targetInput ? parseInt(targetInput) : undefined
        };
        onAdd(newOffer);
        toast.success("Offer added to slot");
    }

    setIsAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedItem(null);
    setPriceInput('');
    setQtyInput('');
    setTargetInput('');
    setOfferType('buy');
    setEditingOfferId(null);
  };

  const handleCompleteFlip = (offer: ActiveOffer) => {
    if (offer.type === 'buy') {
        // Convert to Sell
        onUpdate({
            ...offer,
            type: 'sell',
            originalBuyPrice: offer.price,
            price: offer.targetPrice || (prices[offer.item.id]?.high || 0),
            targetPrice: undefined
        });
        toast.success("Offer updated to Selling");
    } else {
        // Prepare Log Dialog
        setCompletionItem(offer.item);
        setCompletionValues({
            quantity: offer.quantity,
            sellPrice: offer.price,
            buyPrice: offer.originalBuyPrice || undefined
        });
        setOfferToCompleteId(offer.id);
    }
  };

  const finalizeTradeLog = (trade: Trade) => {
      onLogTrade(trade);
      if (offerToCompleteId) {
          onRemove(offerToCompleteId);
      }
      setCompletionItem(null);
      setOfferToCompleteId(null);
  };
  
  const handlePriceKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setValue: (val: string) => void,
    suggestion?: number
  ) => {
    if (!value && suggestion !== undefined) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setValue((suggestion + 1).toString());
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setValue((suggestion - 1).toString());
        }
    }
  };

  const slotsUsed = offers.length;
  const totalValue = offers.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const currentPriceData = selectedItem ? prices[selectedItem.id] : undefined;
  const suggestedMainPrice = currentPriceData 
    ? (offerType === 'buy' ? currentPriceData.low : currentPriceData.high) 
    : undefined;
  const suggestedTargetPrice = currentPriceData ? currentPriceData.high : undefined;

  return (
    <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-500" />
                GE Slots ({slotsUsed}/8)
                <span className="text-sm font-mono font-normal text-slate-500 ml-2 border-l border-slate-800 pl-2">
                    Active Value: {formatGP(totalValue)}
                </span>
            </h2>
            <Button size="sm" onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={slotsUsed >= 8}>
                <Plus className="mr-2 h-4 w-4" /> Add Offer
            </Button>
            
            <Dialog open={isAddOpen} onOpenChange={(open) => {
                setIsAddOpen(open);
                if(!open) resetForm();
            }}>
                <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingOfferId ? 'Edit GE Offer' : 'Add GE Offer'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {!selectedItem ? (
                            <div className="space-y-2">
                                <Label>Select Item</Label>
                                <ItemSearch items={items} onSelect={setSelectedItem} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-800">
                                    <ItemIcon item={selectedItem} size="md" />
                                    <div>
                                        <p className="font-bold">{selectedItem.name}</p>
                                        {!editingOfferId && (
                                            <button onClick={() => setSelectedItem(null)} className="text-xs text-blue-400 hover:underline">Change Item</button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
                                        <button 
                                            onClick={() => setOfferType('buy')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${offerType === 'buy' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Buying
                                        </button>
                                        <button 
                                            onClick={() => setOfferType('sell')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${offerType === 'sell' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Selling
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{offerType === 'buy' ? 'Buy Price' : 'Sell Price'}</Label>
                                        <Input 
                                            type="number" 
                                            value={priceInput} 
                                            onChange={e => setPriceInput(e.target.value)}
                                            onKeyDown={(e) => handlePriceKeyDown(e, priceInput, setPriceInput, suggestedMainPrice)}
                                            className="bg-slate-900 border-slate-800"
                                            placeholder={suggestedMainPrice?.toString()}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input 
                                            type="number" 
                                            value={qtyInput} 
                                            onChange={e => setQtyInput(e.target.value)}
                                            className="bg-slate-900 border-slate-800"
                                        />
                                    </div>
                                    
                                    {offerType === 'buy' && (
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-slate-400 flex justify-between">
                                                <span>Target Sell Price (Optional)</span>
                                                <span className="text-xs font-normal">For profit calc</span>
                                            </Label>
                                            <Input 
                                                type="number" 
                                                value={targetInput} 
                                                onChange={e => setTargetInput(e.target.value)}
                                                onKeyDown={(e) => handlePriceKeyDown(e, targetInput, setTargetInput, suggestedTargetPrice)}
                                                className="bg-slate-900 border-slate-800"
                                                placeholder={suggestedTargetPrice?.toString()}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={handleSaveOffer} disabled={!selectedItem}>
                            {editingOfferId ? 'Update Offer' : 'Confirm Offer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        {/* Completion Dialog */}
        {completionItem && (
            <TradeLogDialog 
                isOpen={!!completionItem}
                onOpenChange={(open) => !open && setCompletionItem(null)}
                item={completionItem}
                initialValues={completionValues}
                onSave={finalizeTradeLog}
            />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {offers.map((offer) => {
                const currentPrice = prices[offer.item.id];
                
                return (
                    <Card key={offer.id} className="bg-slate-900 border-slate-800 relative group overflow-hidden hover:border-slate-700 transition-colors">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${offer.type === 'buy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <ItemIcon item={offer.item} size="sm" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{offer.item.name}</p>
                                        <div className="flex gap-1">
                                            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-slate-800 text-slate-400">
                                                {offer.type.toUpperCase()}
                                            </Badge>
                                            {offer.originalBuyPrice && offer.type === 'sell' && (
                                                <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-blue-900/30 text-blue-400 border-blue-900/50">
                                                    Bought: {formatGP(offer.originalBuyPrice)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => handleOpenEdit(offer)} 
                                        className="text-slate-600 hover:text-blue-400 transition-colors p-1"
                                        title="Edit Offer"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button 
                                        onClick={() => onRemove(offer.id)} 
                                        className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                                        title="Remove Offer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                                <div>
                                    <p className="text-slate-500">Price</p>
                                    <p className="text-slate-200">{formatGP(offer.price)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500">Total</p>
                                    <p className="text-slate-200">{formatGP(offer.price * offer.quantity)}</p>
                                </div>
                            </div>

                            {/* Live Tracking */}
                            {currentPrice && (
                                <div className="bg-slate-950 rounded p-2 text-xs mb-3 border border-slate-800/50">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-500">Current Market</span>
                                        <span className={offer.type === 'buy' ? 'text-blue-400' : 'text-emerald-400'}>
                                            {formatGP(offer.type === 'buy' ? currentPrice.low : currentPrice.high)}
                                        </span>
                                    </div>
                                    {offer.type === 'buy' && (
                                        <div className="flex justify-between border-t border-slate-800 pt-1 mt-1">
                                            <span className="text-slate-500">Margin</span>
                                            <span className={currentPrice.high - offer.price > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                                {formatGP(currentPrice.high - offer.price)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full h-7 text-xs border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500"
                                onClick={() => handleCompleteFlip(offer)}
                            >
                                {offer.type === 'buy' ? (
                                    <>To Sell <ArrowRight className="ml-1 h-3 w-3" /></>
                                ) : (
                                    <>Log Profit <CheckCircle2 className="ml-1 h-3 w-3" /></>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
            
            {/* Empty Slots */}
            {Array.from({ length: 8 - offers.length }).map((_, i) => (
                <div key={i} className="border-2 border-dashed border-slate-800/50 rounded-lg h-[180px] flex items-center justify-center">
                    <span className="text-slate-700 text-xs font-medium uppercase tracking-wider">Empty Slot</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ActiveOffers;