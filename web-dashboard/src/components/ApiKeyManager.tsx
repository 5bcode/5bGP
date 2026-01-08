"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Copy, Key, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  label: string;
  key_value: string;
  created_at: string;
}

const ApiKeyManager = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user]);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error fetching keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          label: newLabel || 'RuneLite Plugin',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setKeys([data, ...keys]);
      setNewLabel('');
      toast.success('API Key created successfully');
    } catch (error: any) {
      console.error('Error creating key:', error);
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setKeys(keys.filter(k => k.id !== id));
      toast.success('API Key revoked');
    } catch (error) {
      console.error('Error deleting key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyKey = (key: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(key);
      toast.success('Key copied to clipboard');
    } else {
      // Fallback for non-secure contexts (HTTP)
      const textArea = document.createElement("textarea");
      textArea.value = key;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Key copied to clipboard');
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        toast.error('Failed to copy key manually');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Key className="text-emerald-500" size={18} /> Plugin API Keys
        </h3>
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
          <ShieldCheck size={10} /> SECURE STORAGE
        </div>
      </div>
      <div className="p-6 space-y-6">
        <p className="text-sm text-slate-500">
          Generate a secure key to link your **RuneLite Plugin** with your web dashboard. These keys grant access to your trade logs—do not share them.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Key Label (e.g. Home Desktop)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="bg-slate-950/50 border-slate-800 text-slate-200"
          />
          <Button onClick={createKey} disabled={creating || !user} className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px] font-bold">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Generate Key</>}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center text-slate-600 py-12 border-2 border-dashed border-slate-800/50 rounded-xl bg-slate-900/10">
            No active API keys. Generate one to start syncing.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/20">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800/50 hover:bg-transparent">
                  <TableHead className="text-slate-500 text-[10px] uppercase font-bold py-3">Label</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase font-bold">Key Identity</TableHead>
                  <TableHead className="text-slate-500 text-[10px] uppercase font-bold">Issued</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/30">
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-none hover:bg-slate-800/30 transition-colors group">
                    <TableCell className="font-bold text-slate-200">{key.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">{key.key_value.slice(0, 8)}...{key.key_value.slice(-4)}</code>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-emerald-400" onClick={() => copyKey(key.key_value)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteKey(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeyManager;