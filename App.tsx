import React, { useState, useEffect, useCallback } from 'react';
import { AuthGate } from './components/AuthGate';
import { Intake } from './components/Intake';
import { ResultView } from './components/ResultView';
import { ErrorBoundary } from './components/ErrorBoundary'; // Import Safety Boundary
import InpaintingCanvas, { COLORS } from './components/InpaintingCanvas';
import { PromptManager } from './components/PromptManager';
import { AppStep, EstateState, MaskLayer, ProcessingRequest } from './types';
import { KeyRound, AlertTriangle, XCircle, Paintbrush, Eraser, Move, Sliders, RefreshCw } from 'lucide-react';
import { processEstateImage, refineEstateImage } from './services/orchestrator';
import { saveImageToDB, getImageFromDB, clearImageFromDB } from './services/storage';
import { Toaster, toast } from 'sonner';

// APP VERSION LOG
console.log("🚀 CASA KEYS APP - VERSION 4.0 (DUAL AI ORCHESTRATION)");

const App: React.FC = () => {
  const [state, setState] = useState<EstateState>({
    step: AppStep.LOGIN,
    isAuthenticated: false,
    originalImage: null, // FULL RES BLOB (For AI)
    originalImagePreview: null, // RESIZED BLOB URL (For Display)
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

  // New State for Orchestrator Context
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  // Clean up Blob URLs
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
              if (restoredBlob) {
                restoredUrl = URL.createObjectURL(restoredBlob);
              }
            } catch (e) {
              console.error("Failed to restore image", e);
            }

            if (!restoredBlob) {
              parsed.step = AppStep.INTAKE;
            }
          }

          setState(prev => ({
            ...prev,
            ...parsed,
            originalImage: restoredBlob,
            originalImagePreview: restoredUrl,
            error: null
          }));
        } catch (e) {
          localStorage.removeItem('estateFix_state');
        }
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (state.isAuthenticated) {
      const stateToSave = {
        step: state.step,
        isAuthenticated: state.isAuthenticated,
        userRequest: state.userRequest,
        layers: state.layers,
      };
      localStorage.setItem('estateFix_state', JSON.stringify(stateToSave));
    }
  }, [state]);

  const handleAuthenticated = useCallback(() => {
    setState(prev => {
      if (prev.isAuthenticated) return prev;
      return { ...prev, isAuthenticated: true, step: AppStep.INTAKE };
    });
  }, []);

  // Helper: Resize for Display (Crucial for preventing canvas crash)
  const createDisplayBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            // Max 1600px is safe for all devices including mobile
            const MAX_SIZE = 1600;
            let w = img.width;
            let h = img.height;

            if (w > h) {
              if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
            } else {
              if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else resolve(file); // Fallback to original
              }, 'image/jpeg', 0.9);
            } else {
              resolve(file); // Context failed
            }
          } catch (e) {
            console.error("Resize failed", e);
            resolve(file); // Critical fail, fallback to original
          }
        };
        img.onerror = () => resolve(file); // Image load failed
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file); // File read failed
      reader.readAsDataURL(file);
    });
  };

  const handleIntakeComplete = async (file: File) => {
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      // 1. Save ORIGINAL High-Res to DB (for final processing)
      try {
        await saveImageToDB('currentImage', file);
      } catch (dbError) {
        console.warn("Persistence warning", dbError);
      }

      // 2. Create OPTIMIZED version for Display/Canvas (prevents UI Crash)
      const displayBlob = await createDisplayBlob(file);
      const displayUrl = URL.createObjectURL(displayBlob);

      setState(prev => ({
        ...prev,
        originalImage: file, // Keep 4K Original
        originalImagePreview: displayUrl, // Use Safe HD Version
        step: AppStep.EDITING,
      }));

    } catch (err: any) {
      console.error(err);
      toast.error("Erreur d'importation de l'image.");
      // setState(prev => ({ ...prev, error: "Erreur d'importation." }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasksChange = (newMasks: { [color: string]: string }) => {
    setMasks(newMasks);
  };

  const handlePromptChange = (color: string, value: string) => {
    setPrompts(prev => ({ ...prev, [color]: value }));
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async () => {
    if (!state.originalImage) return;
    setIsLoading(true);
    setState(prev => ({ ...prev, step: AppStep.PROCESSING, error: null }));

    try {
      // Send the ORIGINAL High-Res Image to AI
      const base64Image = await blobToBase64(state.originalImage as Blob);

      const layers: MaskLayer[] = Object.keys(masks).map((color, index) => ({
        id: index,
        color,
        prompt: prompts[color] || state.userRequest || "Improve this area",
        base64Mask: masks[color] // Mask is relative, backend/AI will handle scaling or we assume aspect ratio matches
      })).filter(layer => layer.base64Mask);

      const request: ProcessingRequest = {
        originalImage: base64Image,
        layers
      };

      // USE ORCHESTRATOR
      const { imageUrl, finalPrompt } = await processEstateImage(request);

      setCurrentPrompt(finalPrompt);

      setState(prev => ({
        ...prev,
        step: AppStep.RESULT,
        correctedImage: imageUrl,
        layers
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        step: AppStep.EDITING,
        // error: err.message || "Le traitement a échoué" // Legacy
      }));
      toast.error(err.message || "Le traitement a échoué");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!state.correctedImage) return;
    setIsLoading(true);

    try {
      // In a real app we would pass the "Seed" or the server-side ID of the image
      // Here we pass the current image blob (data url)
      const { imageUrl, finalPrompt } = await refineEstateImage(
        state.correctedImage,
        currentPrompt,
        instruction
      );

      setCurrentPrompt(finalPrompt);
      setState(prev => ({ ...prev, correctedImage: imageUrl }));

    } catch (err: any) {
      console.error(err);
      toast.error("Echec de la retouche: " + err.message);
      setState(prev => ({ ...prev, error: "Echec de la retouche" })); // Keep state for safety but toast is primary
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('estateFix_state');
    clearImageFromDB('currentImage');
    setState({
      step: AppStep.INTAKE,
      isAuthenticated: true,
      originalImage: null,
      originalImagePreview: null,
      layers: [],
      userRequest: '',
      correctedImage: null,
      error: null,
    });
    setPrompts({});
    setMasks({});
    setCurrentPrompt("");
  };

  return (
    <AuthGate onAuthenticated={handleAuthenticated}>
      <div className="min-h-screen bg-[#f5f5f4] text-stone-800 font-sans relative">
        <Toaster richColors position="bottom-center" toastOptions={{ style: { background: '#1c1917', color: 'white', border: '1px solid #333' } }} />


        <header className="bg-white border-b border-stone-200 h-20 flex items-center px-8 shadow-sm justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#9a4430] flex items-center justify-center text-white"><KeyRound size={20} /></div>
            <span className="text-[#9a4430] font-bold text-lg">CASA KEYS</span>
          </div>
          {/* Ajout du bouton "Nouvelle photo" si on est en mode édition */}
          {state.step === AppStep.EDITING && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-800 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Changer d'image
            </button>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {state.step === AppStep.INTAKE && <Intake onComplete={handleIntakeComplete} isLoading={isLoading} />}

          {state.step === AppStep.EDITING && state.originalImagePreview && (
            <ErrorBoundary>
              <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
                <div className="flex-1 space-y-4">
                  {/* Canvas Controls */}
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center gap-6">
                    <div className="flex bg-stone-100 p-1 rounded-xl">
                      <button
                        onClick={() => setTool('brush')}
                        className={`p-2 rounded-lg transition-all ${tool === 'brush' ? 'bg-white shadow-sm text-[#9a4430]' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        <Paintbrush size={20} />
                      </button>
                      <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white shadow-sm text-[#9a4430]' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        <Eraser size={20} />
                      </button>
                      <button
                        onClick={() => setTool('pan')}
                        className={`p-2 rounded-lg transition-all ${tool === 'pan' ? 'bg-white shadow-sm text-[#9a4430]' : 'text-stone-400 hover:text-stone-600'}`}
                      >
                        <Move size={20} />
                      </button>
                    </div>

                    <div className="h-8 w-px bg-stone-200" />

                    <div className="flex items-center gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setActiveColor(c.hex); setTool('brush'); }}
                          className={`w-8 h-8 rounded-full border-4 transition-all ${activeColor === c.hex ? 'scale-110 shadow-md' : 'scale-90 opacity-40 hover:opacity-100'}`}
                          style={{ backgroundColor: c.hex, borderColor: activeColor === c.hex ? 'white' : 'transparent' }}
                          title={c.label}
                        />
                      ))}
                    </div>

                    <div className="h-8 w-px bg-stone-200" />

                    <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                      <Sliders size={16} className="text-stone-400" />
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="flex-1 accent-[#9a4430]"
                      />
                      <span className="text-xs font-mono text-stone-500 w-8">{brushSize}px</span>
                    </div>
                  </div>

                  <InpaintingCanvas
                    imagePreview={state.originalImagePreview}
                    activeColor={activeColor}
                    brushSize={brushSize}
                    tool={tool}
                    onMasksChange={handleMasksChange}
                  />
                </div>

                <PromptManager
                  prompts={prompts}
                  usedColors={Object.keys(masks).filter(k => masks[k])}
                  onPromptChange={handlePromptChange}
                  onSubmit={handleSubmit}
                  isProcessing={isLoading}
                />
              </div>
            </ErrorBoundary>
          )}

          {state.step === AppStep.PROCESSING && (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-20 h-20 border-4 border-[#9a4430]/20 border-t-[#9a4430] rounded-full animate-spin mb-8" />
              <h2 className="text-2xl font-bold text-stone-800">CASA KEYS AI travaille...</h2>
              <ul className="text-stone-500 mt-4 space-y-2 text-center text-sm">
                <li className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-0">1. Analyse structurelle et lumineuse</li>
                <li className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-1000">2. Reformulation experte du prompt (Gemini)</li>
                <li className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-2000">3. Rendu Haute Fidélité (Nano Banana)</li>
              </ul>
            </div>
          )}

          {state.step === AppStep.RESULT && (
            <ResultView
              originalImage={state.originalImagePreview!}
              correctedImage={state.correctedImage}
              onReset={handleReset}
              onRefine={handleRefine}
              isProcessing={isLoading}
            />
          )}
        </main>
      </div>
    </AuthGate>
  );
};

export default App;