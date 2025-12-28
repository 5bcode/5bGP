import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Copy, Key } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  label: string;
  key_value: string;
  created_at: string;
}

const ApiKeyManager = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

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
    setCreating(true);
    try {
      // Use RPC or direct insert if RLS allows.
      // We will simply insert. The backend should handle generation if key_value is default, 
      // but here we rely on the database default gen_random_uuid() for the key_value.
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ label: newLabel || 'RuneLite Plugin' }])
        .select()
        .single();

      if (error) throw error;

      setKeys([data, ...keys]);
      setNewLabel('');
      toast.success('API Key created');
    } catch (error) {
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
      toast.success('API Key deleted');
    } catch (error) {
      console.error('Error deleting key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Key copied to clipboard');
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Key className="h-5 w-5 text-emerald-500" /> Plugin API Keys
        </CardTitle>
        <CardDescription className="text-slate-500">
          Generate keys to authenticate your RuneLite plugin. Treat these like passwords.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Label (e.g. My Desktop)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="bg-slate-950 border-slate-800"
          />
          <Button onClick={createKey} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Create</>}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center text-slate-500 py-8 border border-dashed border-slate-800 rounded">
            No API keys found. Generate one to start syncing data.
          </div>
        ) : (
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800 hover:bg-slate-950">
                  <TableHead className="text-slate-400">Label</TableHead>
                  <TableHead className="text-slate-400">Key ID</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200">{key.label}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-400 flex items-center gap-2">
                      {key.key_value}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-emerald-400" onClick={() => copyKey(key.key_value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-500" onClick={() => deleteKey(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeyManager;