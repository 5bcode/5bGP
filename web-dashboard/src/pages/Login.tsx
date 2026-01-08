import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal } from 'lucide-react';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                <Terminal size={28} />
            </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">FlipTo5B Terminal</h1>
        <p className="text-slate-500 mt-2">OSRS Real-Time Market Analytics</p>
      </div>

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-slate-100">
            Sign In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#10b981', // emerald-500
                    brandAccent: '#059669', // emerald-600
                    inputBackground: '#020617', // slate-950
                    inputText: '#f8fafc', // slate-50
                    inputBorder: '#1e293b', // slate-800
                    inputBorderFocus: '#10b981',
                    inputBorderHover: '#334155',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                },
              },
            }}
            providers={[]}
            theme="dark"
          />
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-slate-600">
        Secure authentication powered by Supabase
      </p>
    </div>
  );
};

export default Login;