import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthGate } from './components/AuthGate';
import { Intake } from './components/Intake';
import { ResultView } from './components/ResultView';
import { ErrorBoundary } from './components/ErrorBoundary';
import InpaintingCanvas, { COLORS } from './components/InpaintingCanvas';
import { PromptManager } from './components/PromptManager';
import { AppStep, EstateState, MaskLayer, ProcessingRequest } from './types';
import { KeyRound, Paintbrush, Eraser, Move, Sliders, RefreshCw } from 'lucide-react';
import { processEstateImage, refineEstateImage } from './services/orchestrator';
import { saveImageToDB, getImageFromDB, clearImageFromDB } from './services/storage';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';

const App: React.FC = () => {
  const [state, setState] = useState<EstateState>({
    step: AppStep.LOGIN,
    isAuthenticated: false,
    originalImage: null,
    originalImagePreview: null,
    layers: [],
    userRequest: '',
    correctedImage: null,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeColor, setActiveColor] = useState(COLORS[0].hex);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
  const [brushSize, setBrushSize] = useState(20);
  const [prompts, setPrompts] = useState<{ [color: string]: string }>({});
  const [masks, setMasks] = useState<{ [color: string]: string }>({});
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  useEffect(() => {
    return () => {
      if (state.originalImagePreview && state.originalImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(state.originalImagePreview);
      }
    }
  }, [state.originalImagePreview]);

  useEffect(() => {
    const loadState = async () => {
      const savedState = localStorage.getItem('estateFix_state');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          let restoredBlob: Blob | null = null;
          let restoredUrl: string | null = null;

          if (parsed.step === AppStep.EDITING || parsed.step === AppStep.PROCESSING || parsed.step === AppStep.RESULT) {
            try {
              restoredBlob = await getImageFromDB('currentImage');
              if (restoredBlob) restoredUrl = URL.createObjectURL(restoredBlob);
            } catch (e) { console.error(e); }
            if (!restoredBlob) parsed.step = AppStep.INTAKE;
          }

          setState(prev => ({ ...prev, ...parsed, originalImage: restoredBlob, originalImagePreview: restoredUrl, error: null }));
        } catch (e) { localStorage.removeItem('estateFix_state'); }
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (state.isAuthenticated) {
      const { step, isAuthenticated, userRequest, layers } = state;
      localStorage.setItem('estateFix_state', JSON.stringify({ step, isAuthenticated, userRequest, layers }));
    }
  }, [state]);

  const handleAuthenticated = useCallback(() => {
    setState(prev => prev.isAuthenticated ? prev : { ...prev, isAuthenticated: true, step: AppStep.INTAKE });
  }, []);

  const createDisplayBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1600;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
          else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.9);
          } else resolve(file);
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleIntakeComplete = async (file: File) => {
    setIsLoading(true);
    try {
      await saveImageToDB('currentImage', file);
      const displayBlob = await createDisplayBlob(file);
      setState(prev => ({ ...prev, originalImage: file, originalImagePreview: URL.createObjectURL(displayBlob), step: AppStep.EDITING }));
    } catch (err) { toast.error("Erreur d'importation"); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!state.originalImage) return;
    setIsLoading(true);
    setState(prev => ({ ...prev, step: AppStep.PROCESSING }));
    try {
      const base64Image = await new Promise<string>((res) => {
        const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(state.originalImage as Blob);
      });
      const layers: MaskLayer[] = Object.keys(masks).map((color, i) => ({
        id: i, color, prompt: prompts[color] || "Improve this area", base64Mask: masks[color]
      })).filter(l => l.base64Mask);

      const { imageUrl, finalPrompt } = await processEstateImage({ originalImage: base64Image, layers });
      setCurrentPrompt(finalPrompt);
      if (imageUrl.length < 500) toast.warning("Mode Simulation actif");
      setState(prev => ({ ...prev, step: AppStep.RESULT, correctedImage: imageUrl, layers }));
    } catch (err: any) {
      toast.error(err.message || "Echec");
      setState(prev => ({ ...prev, step: AppStep.EDITING }));
    } finally { setIsLoading(false); }
  };

  const handlePromptChange = (color: string, value: string) => {
    setPrompts(prev => ({ ...prev, [color]: value }));
  };

  const handleRefine = async (instruction: string) => {
    if (!state.correctedImage) return;
    setIsLoading(true);
    try {
      const { imageUrl, finalPrompt } = await refineEstateImage(state.correctedImage, currentPrompt, instruction);
      setCurrentPrompt(finalPrompt);
      toast.success("Image affinée");
      setState(prev => ({ ...prev, correctedImage: imageUrl }));
    } catch (err: any) { toast.error(err.message); }
    finally { setIsLoading(false); }
  };

  const handleReset = () => {
    clearImageFromDB('currentImage');
    setState({ step: AppStep.INTAKE, isAuthenticated: true, originalImage: null, originalImagePreview: null, layers: [], userRequest: '', correctedImage: null, error: null });
    setPrompts({}); setMasks({}); setCurrentPrompt("");
  };

  return (
    <AuthGate onAuthenticated={handleAuthenticated}>
      <div className="min-h-screen bg-[#f5f5f4] text-stone-800 font-sans relative selection:bg-[#9a4430]/10">
        <Toaster richColors position="bottom-center" toastOptions={{ style: { background: '#1c1917', color: 'white', border: '1px solid #333' } }} />

        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200 h-20 flex items-center px-8 justify-between">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#9a4430] flex items-center justify-center text-white shadow-lg shadow-[#9a4430]/20 rotate-3"><KeyRound size={20} /></div>
            <span className="text-[#1c1917] font-black text-xl tracking-tighter">CASA KEYS</span>
          </motion.div>
          {state.step === AppStep.EDITING && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all active:scale-95">
              <RefreshCw size={14} /> Changer d'image
            </motion.button>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {state.step === AppStep.INTAKE && (
              <motion.div key="intake" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Intake onComplete={handleIntakeComplete} isLoading={isLoading} />
              </motion.div>
            )}

            {state.step === AppStep.EDITING && state.originalImagePreview && (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorBoundary>
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-stone-200 shadow-xl shadow-stone-200/50 flex flex-wrap items-center gap-6">
                        <div className="flex bg-stone-200/50 p-1.5 rounded-2xl">
                          {[{ id: 'brush', icon: Paintbrush }, { id: 'eraser', icon: Eraser }, { id: 'pan', icon: Move }].map(t => (
                            <button key={t.id} onClick={() => setTool(t.id as any)} className={cn("p-2.5 rounded-xl transition-all", tool === t.id ? "bg-white shadow-md text-[#9a4430]" : "text-stone-400 hover:text-stone-600")}>
                              <t.icon size={22} />
                            </button>
                          ))}
                        </div>
                        <div className="h-10 w-px bg-stone-200" />
                        <div className="flex items-center gap-3">
                          {COLORS.map((c) => (
                            <button key={c.id} onClick={() => { setActiveColor(c.hex); setTool('brush'); }} className={cn("w-9 h-9 rounded-full border-[3px] transition-all hover:scale-110", activeColor === c.hex ? "border-white shadow-lg ring-2 ring-[#9a4430]/20" : "border-transparent opacity-40 hover:opacity-100")} style={{ backgroundColor: c.hex }} />
                          ))}
                        </div>
                        <div className="h-10 w-px bg-stone-200" />
                        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                          <Sliders size={18} className="text-stone-400" />
                          <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="flex-1 accent-[#9a4430] h-1.5 rounded-lg appearance-none bg-stone-200" />
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-12">{brushSize}px</span>
                        </div>
                      </div>
                      <InpaintingCanvas imagePreview={state.originalImagePreview} activeColor={activeColor} brushSize={brushSize} tool={tool} onMasksChange={setMasks} />
                    </div>
                    <PromptManager prompts={prompts} usedColors={Object.keys(masks).filter(k => masks[k])} onPromptChange={handlePromptChange} onSubmit={handleSubmit} isProcessing={isLoading} />
                  </div>
                </ErrorBoundary>
              </motion.div>
            )}

            {state.step === AppStep.PROCESSING && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32">
                <div className="relative w-32 h-32 mb-12">
                  <div className="absolute inset-0 border-8 border-stone-200 rounded-full" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-8 border-t-[#9a4430] rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center text-[#9a4430]"><RefreshCw size={40} className="animate-pulse" /></div>
                </div>
                <h2 className="text-3xl font-black text-[#1c1917] tracking-tight">MAGIE EN COURS...</h2>
                <div className="text-stone-400 mt-6 space-y-3 text-center font-medium max-w-sm">
                  {["Analyse de la scène...", "Rendu Nano Banana 4K...", "Finalisation du luxe..."].map((t, i) => (
                    <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 1 }}>{t}</motion.p>
                  ))}
                </div>
              </motion.div>
            )}

            {state.step === AppStep.RESULT && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <ResultView originalImage={state.originalImagePreview!} correctedImage={state.correctedImage} onReset={handleReset} onRefine={handleRefine} isProcessing={isLoading} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AuthGate>
  );
};

export default App;