import React, { useState, useEffect } from 'react';
import { X, Save, Key, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
        window.location.reload(); 
      }, 1000);
    }
  };

  const handleClear = () => {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-stone-100 bg-stone-50">
          <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Key className="text-[#9a4430]" size={20} />
            Configuration API
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">
              Google API Key (Gemini)
            </label>
            <p className="text-xs text-stone-500 mb-2">
              Cette clé est stockée localement dans votre navigateur.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:ring-2 focus:ring-[#9a4430] focus:outline-none transition-all"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
             <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
             <div className="text-xs text-amber-800">
                L'application nécessite un accès aux modèles <strong>gemini-3-flash-preview</strong> et <strong>imagen-3.0</strong>.
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50/50 flex justify-between items-center">
          <button 
             onClick={handleClear}
             className="text-xs text-red-500 hover:text-red-700 underline"
          >
             Effacer la clé
          </button>
          
          <button
            onClick={handleSave}
            disabled={!apiKey}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-all
              ${isSaved 
                ? 'bg-green-600' 
                : 'bg-[#9a4430] hover:bg-[#823927] hover:scale-105 shadow-lg shadow-[#9a4430]/20'}`}
          >
            {isSaved ? (
                <>
                    <Save size={18} />
                    Sauvegardé
                </>
            ) : (
                <>
                    <Save size={18} />
                    Enregistrer
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};