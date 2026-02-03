import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#9a4430] rounded-full blur-[120px] opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#292524] rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/5 backdrop-blur-2xl border border-white/10 max-w-md w-full rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >

        {/* Header Visual */}
        <div className="h-40 bg-gradient-to-br from-[#9a4430] to-[#592215] flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-xl mb-4 rotate-3"
          >
            <KeyRound size={28} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-white tracking-tight">CASA KEYS STUDIO</h1>
            <p className="text-white/60 text-xs mt-2 uppercase tracking-widest font-medium">Accès Restreint • Nano Banana 4K</p>
          </motion.div>
        </div>

        <div className="p-8 space-y-8 bg-gradient-to-b from-white to-stone-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 relative group">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Code d'accès</label>
              <motion.div
                animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => { setError(false); setPassword(e.target.value); }}
                  className={`w-full px-5 py-5 rounded-2xl border-2 bg-white text-3xl tracking-[0.3em] text-center font-bold text-[#292524] shadow-sm transition-all focus:outline-none placeholder:text-stone-200 placeholder:tracking-normal ${error
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-stone-100 focus:border-[#9a4430]/50 focus:shadow-xl focus:shadow-[#9a4430]/5'
                    }`}
                  placeholder="••••••••"
                />
              </motion.div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs text-center font-medium absolute -bottom-6 left-0 right-0"
                >
                  Accès refusé. Veuillez réessayer.
                </motion.p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-[#1c1917] text-white font-bold py-5 rounded-2xl shadow-xl shadow-stone-900/20 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10">Déverrouiller le Studio</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform relative z-10" />
            </motion.button>
          </form>

          <div className="flex items-center justify-center gap-2 text-stone-300 text-[10px] uppercase tracking-widest">
            <ShieldCheck size={12} />
            <span>Secure End-to-End Encryption</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

