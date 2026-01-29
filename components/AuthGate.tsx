import React, { useState } from 'react';
import { KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Updated Password
  const APP_PASSWORD = "CasaKeys1!"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      onAuthenticated();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-[#9a4430]/10 mb-6">
            <KeyRound className="h-10 w-10 text-[#9a4430]" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#9a4430] tracking-tight">
            CASA KEYS
          </h2>
          <p className="text-xs font-semibold tracking-widest text-stone-500 mt-1 uppercase">
            Espace Pro &bull; Immobilier
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">Code d'accès sécurisé</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-stone-300 placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#9a4430] focus:border-[#9a4430] sm:text-sm transition-all shadow-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
              }}
            />
          </div>

          {error && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 mr-2" />
              Identifiants incorrects.
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#9a4430] hover:bg-[#823927] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9a4430] transition-all shadow-md hover:shadow-lg"
            >
              Accéder au Studio
              <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
        <div className="text-center text-xs text-stone-400">
          Indice : Casa...
        </div>
      </div>
    </div>
  );
};