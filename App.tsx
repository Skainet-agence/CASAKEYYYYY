import React, { useState, useEffect } from 'react';
import { AuthGate } from './components/AuthGate';
import { Intake } from './components/Intake';
import { AuditView } from './components/AuditView';
import { ResultView } from './components/ResultView';
import { AppStep, EstateState } from './types';
import { analyzeEstatePhoto, generateCorrection } from './services/gemini';
import { KeyRound, AlertTriangle, XCircle } from 'lucide-react';

// --- UTILS: COMPRESSION & CONVERSION ---

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1536;

      if (width > MAX_WIDTH) {
        height = Math.round(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        'image/jpeg',
        0.8
      );
    };
  });
};

const base64ToFile = async (base64Url: string, filename: string): Promise<File> => {
  const res = await fetch(base64Url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

// --- APP COMPONENT ---

const App: React.FC = () => {
  const [state, setState] = useState<EstateState>({
    step: AppStep.LOGIN,
    isAuthenticated: false,
    originalImage: null,
    originalImagePreview: null,
    userRequest: '',
    analysis: null,
    correctedImage: null,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  // 1. RESTORE STATE ON MOUNT
  useEffect(() => {
    const savedState = localStorage.getItem('estateFix_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState((prev) => ({
          ...prev,
          ...parsed,
          originalImage: null,
          error: null
        }));
      } catch (e) {
        console.warn("Failed to restore state", e);
        localStorage.removeItem('estateFix_state');
      }
    }
  }, []);

  // 2. PERSIST STATE ON CHANGE
  useEffect(() => {
    if (state.isAuthenticated) {
      try {
        const stateToSave = {
          step: state.step,
          isAuthenticated: state.isAuthenticated,
          originalImagePreview: state.originalImagePreview,
          userRequest: state.userRequest,
          analysis: state.analysis,
          correctedImage: state.correctedImage
        };
        localStorage.setItem('estateFix_state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn("State too large for LocalStorage persistence", e);
      }
    }
  }, [state.step, state.isAuthenticated, state.originalImagePreview, state.userRequest, state.analysis, state.correctedImage]);


  const handleAuthenticated = () => {
    setState(prev => ({ ...prev, isAuthenticated: true, step: AppStep.INTAKE }));
  };

  const handleIntakeComplete = async (file: File, request: string) => {
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      
      reader.onload = async () => {
        const preview = reader.result as string;
        
        try {
          const analysis = await analyzeEstatePhoto(compressedFile, request);
          
          setState(prev => ({
            ...prev,
            originalImage: compressedFile,
            originalImagePreview: preview,
            userRequest: request,
            analysis,
            step: AppStep.AUDIT,
            error: null
          }));
        } catch (apiError: any) {
          setState(prev => ({ ...prev, error: apiError.message || "Erreur d'analyse API." }));
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.readAsDataURL(compressedFile);

    } catch (compressionError: any) {
      console.error(compressionError);
      setState(prev => ({ ...prev, error: "Erreur lors du traitement de l'image." }));
      setIsLoading(false);
    }
  };

  const handleValidate = async (useAiSuggestions: boolean) => {
    if (!state.analysis || !state.originalImagePreview) return;
    
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null, correctedImage: null })); 

    try {
        let imageToProcess = state.originalImage;
        if (!imageToProcess) {
            imageToProcess = await base64ToFile(state.originalImagePreview, "restored_image.jpg");
        }

        const corrected = await generateCorrection(
            imageToProcess, 
            state.analysis,
            useAiSuggestions
        );

        setState(prev => ({
            ...prev,
            correctedImage: corrected,
            step: AppStep.RESULT,
            error: null
        }));
    } catch (error: any) {
        console.error("Generation failed:", error);
        setState(prev => ({
            ...prev,
            step: AppStep.AUDIT,
            error: error.message || "Échec de la génération."
        }));
    } finally {
        setIsLoading(false);
    }
  };

  // --- REFINEMENT LOGIC (Loop on Result) ---
  const handleRefine = async (instruction: string) => {
    if (!state.analysis || !state.correctedImage) return;

    setIsLoading(true);
    const previousResult = state.correctedImage;
    setState(prev => ({ ...prev, correctedImage: null, error: null })); // Show loading state

    try {
        // We use the PREVIOUS result as the new input image
        const imageToProcess = await base64ToFile(previousResult, "refinement_source.jpg");

        const refinedImage = await generateCorrection(
            imageToProcess,
            state.analysis, // Keep original context
            false, // Suggestion flag irrelevant for refinement
            instruction // New specific instruction
        );

        setState(prev => ({
            ...prev,
            correctedImage: refinedImage,
            step: AppStep.RESULT,
            error: null
        }));

    } catch (error: any) {
        console.error("Refinement failed:", error);
        // On fail, restore previous image
        setState(prev => ({
            ...prev,
            correctedImage: previousResult,
            error: error.message || "Échec de l'optimisation."
        }));
    } finally {
        setIsLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('estateFix_state');
    setState(prev => ({
        ...prev,
        step: AppStep.INTAKE,
        originalImage: null,
        originalImagePreview: null,
        userRequest: '',
        analysis: null,
        correctedImage: null,
        error: null
    }));
  };

  if (!state.isAuthenticated) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-stone-800 font-sans selection:bg-[#9a4430]/20 relative">

      {/* ERROR BANNER */}
      {state.error && (
        <div className="bg-red-50 border-b border-red-200 p-4 sticky top-0 z-50 animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
             <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
             <div className="flex-1">
                <h4 className="text-sm font-bold text-red-800">Une erreur est survenue</h4>
                <p className="text-sm text-red-700">{state.error}</p>
             </div>
             <button onClick={() => setState(prev => ({...prev, error: null}))} className="text-red-400 hover:text-red-600">
                <XCircle size={20} />
             </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* LEFT: LOGO */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-[#9a4430] flex items-center justify-center text-white shadow-md shadow-[#9a4430]/20">
                      <KeyRound size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[#9a4430] font-bold text-lg leading-tight tracking-tight">CASA KEYS</span>
                      <span className="text-stone-500 text-[10px] font-semibold tracking-widest uppercase">Immobilier</span>
                   </div>
                </div>
                
                <div className="h-8 w-px bg-stone-200 mx-2 hidden sm:block"></div>
                <span className="text-stone-400 font-medium text-sm hidden sm:block">AI Studio</span>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {state.step === AppStep.INTAKE && (
            <Intake onComplete={handleIntakeComplete} isLoading={isLoading} />
        )}

        {state.step === AppStep.AUDIT && state.analysis && (
            <AuditView 
                analysis={state.analysis} 
                onCancel={handleReset} 
                onValidate={handleValidate}
                isProcessing={isLoading}
            />
        )}

        {state.step === AppStep.RESULT && state.originalImagePreview && (
            <ResultView 
                originalImage={state.originalImagePreview}
                correctedImage={state.correctedImage}
                error={state.error}
                onReset={handleReset}
                onRefine={handleRefine}
                isProcessing={isLoading}
            />
        )}
      </main>
      
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-[2px] z-[60] pointer-events-none" />
      )}
    </div>
  );
};

export default App;