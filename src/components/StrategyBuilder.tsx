import React, { useState } from 'react';
import { Strategy } from '@/hooks/use-strategies';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatGP } from '@/lib/osrs-math';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface StrategyBuilderProps {
  onSave: (strategy: Strategy) => void;
}

const StrategyBuilder = ({ onSave }: StrategyBuilderProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [minPrice, setMinPrice] = useState("100");
  const [maxPrice, setMaxPrice] = useState("2147000000"); // Max cash
  const [minVol, setMinVol] = useState([10000]); // Array for slider
  const [minRoi, setMinRoi] = useState([1]);

  const handleSave = () => {
      if (!name) {
          toast.error("Please name your strategy");
          return;
      }

      onSave({
          id: crypto.randomUUID(),
          name,
          minPrice: parseInt(minPrice) || 0,
          maxPrice: parseInt(maxPrice) || 2147000000,
          minVolume: minVol[0],
          minRoi: minRoi[0]
      });
      setOpen(false);
      setName("");
      toast.success("Strategy created");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="bg-slate-900 border-slate-800 text-slate-300">
                <Plus className="mr-2 h-4 w-4" /> Create Strategy
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
            <DialogHeader>
                <DialogTitle>Create New Scanner Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label>Strategy Name</Label>
                    <Input 
                        placeholder="e.g. Safe High Volume" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="bg-slate-900 border-slate-800"
                    />
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Min Price</Label>
                            <Input 
                                type="number"
                                value={minPrice}
                                onChange={e => setMinPrice(e.target.value)}
                                className="bg-slate-900 border-slate-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Price</Label>
                            <Input 
                                type="number"
                                value={maxPrice}
                                onChange={e => setMaxPrice(e.target.value)}
                                className="bg-slate-900 border-slate-800"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Min Daily Volume</Label>
                            <span className="text-xs text-emerald-400 font-mono">{formatGP(minVol[0])}</span>
                        </div>
                        <Slider 
                            value={minVol} 
                            onValueChange={setMinVol} 
                            max={1000000} 
                            step={1000} 
                            className="py-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Min ROI %</Label>
                            <span className="text-xs text-emerald-400 font-mono">{minRoi[0]}%</span>
                        </div>
                        <Slider 
                            value={minRoi} 
                            onValueChange={setMinRoi} 
                            max={50} 
                            step={0.5} 
                            className="py-2"
                        />
                    </div>
                </div>
            </div>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save Strategy</Button>
        </DialogContent>
    </Dialog>
  );
};

export default StrategyBuilder;