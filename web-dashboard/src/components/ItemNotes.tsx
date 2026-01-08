import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Loader2, Cloud, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTradeMode } from '@/context/TradeModeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ItemNotesProps {
  itemId: number;
}

const ItemNotes = ({ itemId }: ItemNotesProps) => {
  const { mode } = useTradeMode();
  const { user } = useAuth();
  
  const [note, setNote] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Note
  useEffect(() => {
    if (mode === 'paper') {
        const allNotes = JSON.parse(localStorage.getItem('itemNotes') || '{}');
        setNote(allNotes[itemId] || "");
        setIsDirty(false);
    } else {
        if (!user) {
            setNote("");
            return;
        }

        const fetchNote = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('item_notes')
                    .select('note')
                    .eq('user_id', user.id)
                    .eq('item_id', itemId)
                    .maybeSingle();

                if (error) throw error;
                setNote(data?.note || "");
            } catch (err) {
                console.error("Error fetching note:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }
  }, [itemId, mode, user]);

  const handleSave = async () => {
    if (mode === 'paper') {
        const allNotes = JSON.parse(localStorage.getItem('itemNotes') || '{}');
        if (note.trim()) {
            allNotes[itemId] = note;
        } else {
            delete allNotes[itemId];
        }
        localStorage.setItem('itemNotes', JSON.stringify(allNotes));
        setIsDirty(false);
        toast.success("Note saved (Local)");
    } else {
        if (!user) return;
        setSaving(true);
        try {
            if (!note.trim()) {
                // Delete if empty
                await supabase
                    .from('item_notes')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('item_id', itemId);
            } else {
                // Upsert
                const { error } = await supabase
                    .from('item_notes')
                    .upsert({
                        user_id: user.id,
                        item_id: itemId,
                        note: note,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id, item_id' });
                
                if (error) throw error;
            }
            setIsDirty(false);
            toast.success("Note saved to cloud");
        } catch (err) {
            console.error("Error saving note:", err);
            toast.error("Failed to save note");
        } finally {
            setSaving(false);
        }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNote(e.target.value);
      setIsDirty(true);
  };

  return (
    <Card className="bg-amber-950/10 border-amber-900/30">
        <CardHeader className="pb-2 border-b border-amber-900/20">
            <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                    <StickyNote size={16} /> Trader's Notebook
                </CardTitle>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    {mode === 'paper' ? (
                        <><CloudOff size={10} /> Local</>
                    ) : (
                        <><Cloud size={10} /> Cloud</>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-4 relative">
            {loading ? (
                <div className="flex justify-center items-center h-[120px]">
                    <Loader2 className="animate-spin text-amber-500 h-6 w-6" />
                </div>
            ) : (
                <Textarea 
                    placeholder="Write your strategy, buy targets, or reminders here..."
                    className="min-h-[120px] bg-slate-950/50 border-amber-900/30 focus:border-amber-500/50 text-slate-200 resize-none"
                    value={note}
                    onChange={handleChange}
                />
            )}
            <div className="flex justify-end mt-2">
                <Button 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={!isDirty || loading || saving}
                    className={`${isDirty ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                    {saving ? (
                        <Loader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                        <Save size={14} className="mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save Note'}
                </Button>
            </div>
        </CardContent>
    </Card>
  );
};

export default ItemNotes;