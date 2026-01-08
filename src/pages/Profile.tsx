import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user?.id)
                .single();

            if (error) throw error;
            if (data) setUsername(data.username || '');
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ username, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Error updating profile');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-8">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <User className="text-emerald-500" />
                        Account Settings
                    </CardTitle>
                </CardHeader>
                <form onSubmit={handleUpdate}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input 
                                    id="email" 
                                    value={email} 
                                    disabled 
                                    className="pl-10 bg-slate-950 border-slate-800 text-slate-400" 
                                />
                            </div>
                            <p className="text-[10px] text-slate-500">Email cannot be changed once the account is created.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username / Alias</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input 
                                    id="username" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your OSRS alias"
                                    className="pl-10 bg-slate-950 border-slate-800 text-slate-200"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t border-slate-800 mt-6 pt-6">
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Profile Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Profile;