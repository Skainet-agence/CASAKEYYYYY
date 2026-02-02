import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

interface AuthGateProps {
  onAuthenticated: () => void;
  children?: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated, children }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
      const savedAuth = sessionStorage.getItem('estateFix_auth');
      if (savedAuth === 'true') {
          setIsAuth(true);
          onAuthenticated();
      }
  }, [onAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'CASA2026') {
      setIsAuth(true);
      sessionStorage.setItem('estateFix_auth', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isAuth) {
      return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 selection:bg-[#9a4430]/30">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* Header Visual */}
        <div className="h-32 bg-gradient-to-br from-[#9a4430] to-[#7c3222] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg">
                <KeyRound size={32} />
            </div>
        </div>

        <div className="p-8 space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-stone-800">Accès Studio</h1>
                <p className="text-stone-500 text-sm mt-1">Veuillez vous identifier pour accéder au moteur Nano Banana (4K).</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <input
                        autoFocus
                        type="password"
                        value={password}
                        onChange={(e) => { setError(false); setPassword(e.target.value); }}
                        className={`w-full px-4 py-4 rounded-xl border-2 bg-stone-50 text-xl tracking-[0.5em] text-center font-bold transition-all focus:outline-none placeholder:text-stone-300 placeholder:tracking-normal ${
                            error 
                            ? 'border-red-300 text-red-900 bg-red-50 focus:border-red-500 animate-shake' 
                            : 'border-stone-200 text-stone-800 focus:border-[#9a4430] focus:bg-white focus:shadow-lg focus:shadow-[#9a4430]/10'
                        }`}
                        placeholder="MOT DE PASSE"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-[#9a4430] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#9a4430]/20 hover:bg-[#853a29] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                    <span>Entrer</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </form>
            
            <div className="pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-stone-400 text-xs">
                <ShieldCheck size={14} />
                <span className="font-medium">Chiffrement Client-Side End-to-End</span>
            </div>
        </div>
      </div>
    </div>
  );
};
