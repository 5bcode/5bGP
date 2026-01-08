"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Calendar, Save, Shield, Cloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);

      const updates = {
        id: user?.id,
        username,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;
      toast.success('Account profile updated');
    } catch (error: any) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Account Settings</h1>
        <p className="text-slate-500">Manage your credentials and sync preferences.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <User className="text-emerald-500" size={18} /> Personal Profile
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <Cloud size={10} /> CLOUD SYNCED
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="metric-label">Account Email</Label>
            <div className="flex items-center gap-2 relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={user.email}
                disabled
                className="bg-slate-950/50 border-slate-800 text-slate-500 pl-10 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-slate-600">Email addresses are verified and cannot be changed manually.</p>
          </div>

          <div className="space-y-2">
            <Label className="metric-label">Public Alias</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-950/50 border-slate-800 text-slate-100 focus:border-emerald-500/50 transition-colors"
              placeholder="Trader123"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="metric-label">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-slate-950/50 border-slate-800 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="metric-label">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-slate-950/50 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/50">
            <Button
              onClick={updateProfile}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto px-8"
            >
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Shield className="text-blue-500" size={18} /> Account Security
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-900 rounded-lg text-slate-500">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Terminal Access Granted</p>
                <p className="text-xs text-slate-500">
                  Member since {new Date(user.created_at).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-950/10 border border-blue-900/20 p-4 rounded-xl">
            <p className="text-xs text-slate-400 leading-relaxed">
              Account security is managed via **Supabase Auth**. To change your password or enable Two-Factor Authentication (2FA), please follow the secure link sent to your registration email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;