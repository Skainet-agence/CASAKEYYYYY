import React from 'react';
import { COLORS } from './InpaintingCanvas';
import { Wand2, Info } from 'lucide-react';

interface PromptManagerProps {
  prompts: { [color: string]: string };
  usedColors: string[];
  onPromptChange: (color: string, value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export const PromptManager: React.FC<PromptManagerProps> = ({
  prompts,
  usedColors,
  onPromptChange,
  onSubmit,
  isProcessing,
}) => {
  return (
    <div className="w-full lg:w-96 flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-[#9a4430]/10 rounded-lg text-[#9a4430]">
            <Info size={20} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 leading-none">Instructions par zone</h3>
            <p className="text-xs text-stone-500 mt-1">Détaillez vos retouches</p>
          </div>
        </div>

        <div className="space-y-4">
          {usedColors.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-stone-100 rounded-xl">
              <p className="text-sm text-stone-400">Utilisez les pinceaux sur l'image<br/>pour créer des zones de retouche.</p>
            </div>
          ) : (
            COLORS.filter(c => usedColors.includes(c.hex)).map((color) => (
              <div key={color.id} className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Zone {color.label}
                  </span>
                </div>
                <textarea
                  value={prompts[color.hex] || ''}
                  onChange={(e) => onPromptChange(color.hex, e.target.value)}
                  placeholder={`Ex: Supprimer ce meuble et ajouter une plante...`}
                  className="w-full p-3 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#9a4430]/20 focus:border-[#9a4430] outline-none transition-all resize-none h-24"
                />
              </div>
            ))
          )}
        </div>

        <button
          onClick={onSubmit}
          disabled={usedColors.length === 0 || isProcessing}
          className={`w-full mt-8 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
            usedColors.length === 0 || isProcessing
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : 'bg-[#9a4430] text-white hover:bg-[#853a29] shadow-lg shadow-[#9a4430]/20 active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Traitement en cours...</span>
            </>
          ) : (
            <>
              <Wand2 size={20} />
              <span>LANCER LA MAGIE</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-stone-100 rounded-xl p-4 text-xs text-stone-500 leading-relaxed border border-stone-200/50">
        <strong>Note :</strong> Plus votre instruction est précise, plus l'IA sera fidèle à votre vision. Vous pouvez demander d'ajouter, de supprimer ou de modifier des éléments.
      </div>
    </div>
  );
};
