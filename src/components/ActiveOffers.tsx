import React, { useState } from 'react';
import { Item, PriceData } from '@/services/osrs-api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Briefcase, ArrowRight, CheckCircle2, Pencil, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatGP } from '@/lib/osrs-math';
import ItemIcon from './ItemIcon';
import ItemSearch from './ItemSearch';
import { toast } from 'sonner';
import TradeLogDialog, { Trade, InitialTradeValues } from './TradeLogDialog';
import { cn } from '@/lib/utils';

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
                item: selectedItem,
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

  const getSlotStatus = (offer: ActiveOffer, priceData?: PriceData) => {
    if (!priceData) return { status: 'neutral', color: 'border-slate-800' };
    
    // Wiki High = Insta Buy Price (Active Sell Offers)
    // Wiki Low = Insta Sell Price (Active Buy Offers)
    const { high, low } = priceData;
    
    if (offer.type === 'buy') {
        // Green: >= High (Insta Buy)
        // Blue: >= Low (Competitive Top Bid)
        // Red: < Low (Buried)
        if (offer.price >= high) return { status: 'better', color: 'border-emerald-500/50 bg-emerald-950/10' };
        if (offer.price >= low) return { status: 'within', color: 'border-blue-500/50 bg-blue-950/10' };
        return { status: 'worse', color: 'border-rose-500/50 bg-rose-950/10' };
    } else {
        // Green: <= Low (Insta Sell)
        // Blue: <= High (Competitive Top Ask)
        // Red: > High (Overpriced)
        if (offer.price <= low) return { status: 'better', color: 'border-emerald-500/50 bg-emerald-950/10' };
        if (offer.price <= high) return { status: 'within', color: 'border-blue-500/50 bg-blue-950/10' };
        return { status: 'worse', color: 'border-rose-500/50 bg-rose-950/10' };
    }
  };

  const formatAge = (timestamp: number) => {
      const seconds = Math.floor((Date.now() / 1000) - timestamp);
      if (seconds < 60) return `00:00:${seconds.toString().padStart(2, '0')}`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                <span className="text-sm font-mono font-normal text-slate-500 ml-2 border-l border-slate-800 pl-2 hidden sm:inline">
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
                const { status, color } = getSlotStatus(offer, currentPrice);
                
                return (
                    <Card key={offer.id} className={cn("bg-slate-900 border-2 relative group overflow-hidden transition-all", color)}>
                        <CardContent className="p-3">
                            {/* Header Row */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-1 items-center">
                                     <span className={cn("font-bold text-sm uppercase", offer.type === 'buy' ? "text-blue-400" : "text-emerald-400")}>
                                        {offer.type}
                                     </span>
                                     <span className="font-mono text-xs text-slate-400 ml-1">{formatAge(offer.timestamp)}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(offer)} className="text-slate-600 hover:text-blue-400 p-0.5"><Pencil size={12} /></button>
                                    <button onClick={() => onRemove(offer.id)} className="text-slate-600 hover:text-rose-500 p-0.5"><X size={14} /></button>
                                </div>
                            </div>

                            {/* Item Info */}
                            <div className="flex items-center gap-3 mb-3">
                                <ItemIcon item={offer.item} size="md" className="shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-sm text-slate-200 truncate">{offer.item.name}</div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-slate-500 font-mono">{offer.quantity.toLocaleString()}</div>
                                        
                                        {/* HOVER TOOLTIP */}
                                        <HoverCard>
                                            <HoverCardTrigger>
                                                <Search size={14} className="text-slate-600 hover:text-emerald-400 cursor-help" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-80 bg-slate-950 border-slate-800 p-4 shadow-2xl">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold text-slate-200">Quick Look</span>
                                                </div>
                                                
                                                {currentPrice ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 text-xs gap-y-1">
                                                            <span className="text-slate-400">Wiki Insta Buy (High)</span>
                                                            <span className="text-right font-mono text-emerald-400">{formatGP(currentPrice.high)}</span>
                                                            
                                                            <span className="text-slate-400">Wiki Insta Sell (Low)</span>
                                                            <span className="text-right font-mono text-blue-400">{formatGP(currentPrice.low)}</span>

                                                            <span className="text-slate-500">Wiki High Age</span>
                                                            <span className="text-right font-mono text-slate-500">{formatAge(currentPrice.highTime)}</span>
                                                            
                                                            <span className="text-slate-500">Wiki Low Age</span>
                                                            <span className="text-right font-mono text-slate-500">{formatAge(currentPrice.lowTime)}</span>
                                                        </div>
                                                        
                                                        <div className="pt-2 border-t border-slate-800 text-center text-xs">
                                                            {status === 'worse' && (
                                                                <>
                                                                    <div className="font-bold text-rose-500 mb-1">
                                                                        {offer.type} offer is not competitive
                                                                    </div>
                                                                    <div className="text-slate-400">
                                                                        {offer.type === 'buy' 
                                                                            ? <span>{formatGP(offer.price)} &lt; {formatGP(currentPrice.low)}</span>
                                                                            : <span>{formatGP(offer.price)} &gt; {formatGP(currentPrice.high)}</span>
                                                                        }
                                                                    </div>
                                                                    <div className="text-slate-300 mt-1">
                                                                         Set price to {offer.type === 'buy' ? '>=' : '<='} <span className="text-emerald-400 font-mono font-bold">
                                                                             {formatGP(offer.type === 'buy' ? currentPrice.low : currentPrice.high)}
                                                                         </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {status === 'within' && (
                                                                <div className="text-blue-400 font-bold">Offer is competitive (Market Rate)</div>
                                                            )}
                                                            {status === 'better' && (
                                                                <div className="text-emerald-500 font-bold">Offer is aggressive (Instant Fill)</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 text-xs">No market data available</div>
                                                )}
                                            </HoverCardContent>
                                        </HoverCard>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Price Bar */}
                            <div className="bg-slate-950/50 rounded p-1.5 mb-2 border border-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 uppercase">Price</span>
                                    <span className="font-mono text-sm font-bold text-slate-200">{formatGP(offer.price)}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
                                    <div className={cn("h-full w-full", 
                                        status === 'better' ? "bg-emerald-500" : 
                                        status === 'within' ? "bg-blue-500" : "bg-rose-500"
                                    )} />
                                </div>
                            </div>
                            
                            <div className="text-center">
                                 <span className="text-[10px] text-slate-500">{formatGP(offer.price * offer.quantity)} total</span>
                            </div>

                            {/* Action Button */}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full h-6 mt-2 text-[10px] hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-600"
                                onClick={() => handleCompleteFlip(offer)}
                            >
                                {offer.type === 'buy' ? (
                                    <>Flip to Sell <ArrowRight className="ml-1 h-3 w-3" /></>
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
                <div key={i} className="border-2 border-dashed border-slate-800/50 rounded-lg h-[200px] flex flex-col items-center justify-center gap-2 group hover:border-slate-700 transition-colors cursor-pointer" onClick={handleOpenAdd}>
                    <span className="text-slate-700 font-bold text-lg group-hover:text-slate-500">Empty</span>
                    <Plus className="text-slate-800 group-hover:text-slate-600" />
                </div>
            ))}
        </div>
    </div>
  );
};

export default ActiveOffers;