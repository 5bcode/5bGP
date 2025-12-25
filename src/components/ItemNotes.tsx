import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ItemNotesProps {
  itemId: number;
}

const ItemNotes = ({ itemId }: ItemNotesProps) => {
  const [note, setNote] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Load note
    const allNotes = JSON.parse(localStorage.getItem('itemNotes') || '{}');
    if (allNotes[itemId]) {
        setNote(allNotes[itemId]);
    } else {
        setNote("");
    }
    setIsDirty(false);
  }, [itemId]);

  const handleSave = () => {
    const allNotes = JSON.parse(localStorage.getItem('itemNotes') || '{}');
    if (note.trim()) {
        allNotes[itemId] = note;
    } else {
        delete allNotes[itemId];
    }
    localStorage.setItem('itemNotes', JSON.stringify(allNotes));
    setIsDirty(false);
    toast.success("Note saved");
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(e.target.value);
      setIsDirty(true);
  };

  return (
    <Card className="bg-amber-950/10 border-amber-900/30">
        <CardHeader className="pb-2 border-b border-amber-900/20">
            <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                <StickyNote size={16} /> Trader's Notebook
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
            <Textarea 
                placeholder="Write your strategy, buy targets, or reminders here..."
                className="min-h-[120px] bg-slate-950/50 border-amber-900/30 focus:border-amber-500/50 text-slate-200 resize-none"
                value={note}
                onChange={handleChange}
            />
            <div className="flex justify-end mt-2">
                <Button 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={!isDirty}
                    className={`${isDirty ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                    <Save size={14} className="mr-2" /> Save Note
                </Button>
            </div>
        </CardContent>
    </Card>
  );
};

export default ItemNotes;