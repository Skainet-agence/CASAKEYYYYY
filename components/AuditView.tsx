import React from 'react';
import { Lightbulb, ArrowLeft, Wand2, Sparkles, ShieldCheck, Home, Lock, Wrench } from 'lucide-react';
import { AnalysisResult } from '../types';

interface AuditViewProps {
  analysis: AnalysisResult;
  onCancel: () => void;
  onValidate: (useAiSuggestions: boolean) => void;
  isProcessing: boolean;
}

export const AuditView: React.FC<AuditViewProps> = ({ analysis, onCancel, onValidate, isProcessing }) => {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      
      {/* HEADER VISION GLOBALE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Room Type */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-md shadow-stone-200/50">
            <div className="p-2 bg-[#9a4430]/10 rounded-lg text-[#9a4430]">
                <Home size={20} />
            </div>
            <div>
                <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Pièce identifiée</p>
                <p className="text-stone-800 font-semibold">{analysis.room_type}</p>
            </div>
        </div>
        
        {/* Anchors Count */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-md shadow-stone-200/50">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <Lock size={20} />
            </div>
            <div>
                <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Conformité</p>
                <p className="text-stone-800 font-semibold">{analysis.visual_anchors.length} Éléments Protégés</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl shadow-stone-200 overflow-hidden p-8">
        <h2 className="text-2xl font-bold text-[#9a4430] font-serif mb-6">Rapport Technique & Conformité</h2>
        
        {/* Understanding (Strict List) */}
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-6 flex gap-4">
          <Wrench className="text-stone-400 flex-shrink-0 mt-1" />
          <div className="w-full">
            <h3 className="font-semibold text-stone-800 mb-3">Actions Techniques Requises</h3>
            <ul className="space-y-2">
                {analysis.understanding_expanded.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-stone-600 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#9a4430] flex-shrink-0"></span>
                        {item}
                    </li>
                ))}
            </ul>
          </div>
        </div>

        {/* ANCRES VISUELLES (Protected) */}
        <div className="mb-6 bg-emerald-50/50 border border-emerald-100 border-dashed rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="text-emerald-600" size={18} />
                <h3 className="font-semibold text-emerald-900 text-sm">PROTECTION DE LA RÉALITÉ (Ne sera pas modifié)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {analysis.visual_anchors.map((anchor, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white border border-emerald-200 rounded-full text-xs text-emerald-700 flex items-center gap-1 shadow-sm">
                        <Lock size={10} className="text-emerald-500" />
                        {anchor}
                    </span>
                ))}
            </div>
        </div>

        {/* Suggestions (Cleaning Only) */}
        <div className="mb-8 bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex gap-4">
          <Lightbulb className="text-blue-500 flex-shrink-0 mt-1" />
          <div className="w-full">
            <h3 className="font-semibold text-blue-900 mb-3">Maintenance & Nettoyage (Suggéré)</h3>
            <p className="text-xs text-blue-600/80 mb-3 italic">
               *Aucun objet ne sera ajouté. Uniquement des corrections soustractives.
            </p>
            <ul className="space-y-2">
              {analysis.ai_staging_suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-blue-800 text-sm">
                   <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                   {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions - SIMPLIFIED FOR CLIENT */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-stone-100 gap-4">
          
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft size={18} />
            Modifier
          </button>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             {/* Button A: STRICT */}
            <button
              onClick={() => onValidate(false)} 
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-stone-700 shadow-sm transition-all border border-stone-300 bg-white hover:bg-stone-50
              ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isProcessing ? (
                 <Wand2 className="animate-spin" size={18} />
              ) : (
                 <Wand2 size={18} />
              )}
              Valider (Strict)
            </button>

             {/* Button B: CLEANING */}
             <button
              onClick={() => onValidate(true)}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all border border-transparent
              ${isProcessing 
                ? 'bg-stone-400 cursor-wait' 
                : 'bg-[#9a4430] hover:bg-[#823927] hover:scale-[1.02] shadow-[#9a4430]/20'}`}
            >
               {isProcessing ? (
                 <Sparkles className="animate-spin" size={18} />
              ) : (
                 <Sparkles size={18} />
              )}
              Valider + Nettoyage IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};