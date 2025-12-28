import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Calendar, Save, Shield } from 'lucide-react';
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
      console.error('Error loading user data!', error.message);
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
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Account Settings</h1>
        <p className="text-slate-500 mt-2">Manage your personal information and preferences.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-500" /> User Profile
          </CardTitle>
          <CardDescription>
            This information is private and only visible to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <Input 
                id="email" 
                value={user.email} 
                disabled 
                className="bg-slate-950 border-slate-800 text-slate-400" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-950 border-slate-800" 
              placeholder="Trader123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="fname">First Name</Label>
                <Input 
                  id="fname" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-950 border-slate-800" 
                />
             </div>
             <div className="space-y-2">
                <Label htmlFor="lname">Last Name</Label>
                <Input 
                  id="lname" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-950 border-slate-800" 
                />
             </div>
          </div>

          <Button 
            onClick={updateProfile} 
            disabled={loading} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
          >
            {loading ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" /> Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <div>
                        <p className="text-sm font-medium text-slate-200">Member Since</p>
                        <p className="text-xs text-slate-500">
                            {new Date(user.created_at).toLocaleDateString(undefined, { 
                                year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                        </p>
                    </div>
                </div>
            </div>
            <div className="text-xs text-slate-500">
                To change your password or delete your account, please contact support.
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;