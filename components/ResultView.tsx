import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, ArrowLeft, AlertOctagon, MoveHorizontal, Send, Sparkles, X, MessageSquarePlus } from 'lucide-react';

interface ResultViewProps {
  originalImage: string;
  correctedImage: string | null;
  error?: string | null;
  onReset: () => void;
  onRefine: (instruction: string) => void;
  isProcessing: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ 
    originalImage, 
    correctedImage, 
    error, 
    onReset, 
    onRefine,
    isProcessing 
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineText, setRefineText] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(x, 0), 100));
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
     if (!containerRef.current) return;
     const rect = containerRef.current.getBoundingClientRect();
     const touch = 'touches' in e ? e.touches[0] : null;
     if (touch) {
         const x = ((touch.clientX - rect.left) / rect.width) * 100;
         setSliderPosition(Math.min(Math.max(x, 0), 100));
     }
  }

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSubmitRefinement = () => {
    if (refineText.trim()) {
        onRefine(refineText);
        setRefineText("");
        setShowRefineInput(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden p-8">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-8 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-4">
                 <button
                    onClick={onReset}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors text-sm font-medium"
                    title="Recommencer avec une nouvelle photo"
                >
                    <ArrowLeft size={16} />
                    Nouvelle Photo
                </button>
            </div>
            
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-[#9a4430] font-serif hidden sm:block">Livraison & Finitions</h2>
                {correctedImage && !error && (
                    <a 
                        href={correctedImage} 
                        download="casa-keys-fix.png"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#9a4430] rounded-lg hover:bg-[#823927] transition-colors shadow-lg shadow-[#9a4430]/20"
                    >
                        <Download size={16} />
                        Télécharger
                    </a>
                )}
            </div>
        </div>

        {/* ERROR STATE */}
        {error ? (
            <div className="bg-red-50 border-2 border-red-100 rounded-xl p-6 mb-8 flex gap-4 items-start animate-in fade-in duration-300">
                <div className="p-3 bg-red-100 rounded-lg text-red-600 flex-shrink-0">
                    <AlertOctagon size={32} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-700 mb-2">Échec de la Génération</h3>
                    <p className="text-red-600 mb-4 text-sm font-mono bg-white p-4 rounded border border-red-200 whitespace-pre-wrap break-all shadow-inner">
                        {error}
                    </p>
                    <button onClick={onReset} className="text-sm underline text-red-800">Réessayer</button>
                </div>
            </div>
        ) : null}

        {/* COMPARISON SLIDER (VISUAL ANCHOR) */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xl select-none group"
             ref={containerRef}
             onTouchMove={handleTouchMove}
        >
            {/* 1. LAYER BOTTOM: CORRECTED (AFTER) */}
            <div className="absolute inset-0 flex items-center justify-center">
                 {correctedImage ? (
                    <img src={correctedImage} alt="After" className="w-full h-full object-contain pointer-events-none" />
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-stone-900/5 animate-pulse">
                         <div className="w-12 h-12 border-4 border-[#9a4430] border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[#9a4430] font-medium animate-pulse">Raffinement de l'image...</p>
                    </div>
                 )}
            </div>

            {/* 2. LAYER TOP: ORIGINAL (BEFORE) */}
            {correctedImage && (
                <div 
                    className="absolute inset-0 overflow-hidden bg-stone-50/50"
                    style={{ width: `${sliderPosition}%`, borderRight: '1px solid rgba(255,255,255,0.5)' }}
                >
                    <img 
                        src={originalImage} 
                        alt="Before" 
                        className="absolute top-0 left-0 h-full max-w-none pointer-events-none" 
                        style={{ width: containerRef.current?.offsetWidth || '100%', objectFit: 'contain' }}
                    />
                    
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded border border-white/10 shadow-lg">
                        ORIGINAL
                    </div>
                </div>
            )}

            {/* Label Après */}
            {correctedImage && (
                <div className="absolute top-4 right-4 bg-[#9a4430]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wider px-2 py-1 rounded border border-white/10 shadow-lg">
                    RÉSULTAT IA
                </div>
            )}

            {/* 3. SLIDER HANDLE */}
            {correctedImage && !isProcessing && (
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center cursor-ew-resize">
                        <MoveHorizontal size={16} className="text-[#9a4430]" />
                    </div>
                </div>
            )}
        </div>

        {/* REFINEMENT CHAT INTERFACE - BOTTOM ACTION */}
        {correctedImage && !isProcessing && (
            <div className="mt-8 pt-6 border-t border-stone-100 transition-all duration-500 ease-in-out">
                {!showRefineInput ? (
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-stone-500 text-sm italic">Le résultat n'est pas parfait ?</p>
                        <button 
                            onClick={() => setShowRefineInput(true)}
                            className="flex items-center gap-2 px-8 py-3 rounded-full text-white bg-gradient-to-r from-stone-700 to-stone-800 hover:from-[#9a4430] hover:to-[#823927] shadow-lg hover:shadow-xl transition-all text-sm font-semibold transform hover:-translate-y-0.5"
                        >
                            <MessageSquarePlus size={16} />
                            Affiner le résultat avec de nouvelles instructions
                        </button>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl p-1 shadow-2xl shadow-[#9a4430]/10 border border-[#9a4430]/20 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="bg-stone-50 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-sm font-bold text-[#9a4430] flex items-center gap-2">
                                    <Sparkles size={14} />
                                    Mode Finition & Retouche
                                 </h3>
                                 <button 
                                    onClick={() => setShowRefineInput(false)} 
                                    className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-200 rounded-full transition-colors"
                                >
                                    <X size={16} />
                                 </button>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={refineText}
                                        onChange={(e) => setRefineText(e.target.value)}
                                        placeholder="Décrivez ce qu'il faut corriger (ex: Tends mieux les draps, éclaircis le coin gauche...)"
                                        className="w-full pl-4 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#9a4430] focus:border-transparent text-sm bg-white shadow-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitRefinement()}
                                        autoFocus
                                    />
                                </div>
                                <button 
                                    onClick={handleSubmitRefinement}
                                    disabled={!refineText.trim()}
                                    className="bg-[#9a4430] hover:bg-[#823927] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                                >
                                    Optimiser <Send size={14} />
                                </button>
                            </div>
                            
                            <div className="mt-3 flex items-start gap-2 text-[11px] text-stone-400 bg-white p-2 rounded-lg border border-stone-100">
                                <AlertOctagon size={12} className="mt-0.5 text-stone-300" />
                                <p>
                                    L'IA va utiliser cette image comme base et appliquer uniquement vos modifications ("Image-to-Image"). 
                                    Les zones non mentionnées resteront identiques.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};