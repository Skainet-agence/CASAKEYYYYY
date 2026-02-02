import React, { useState, useEffect } from 'react';
import { Upload, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';

interface IntakeProps {
  onComplete: (file: File) => void;
  isLoading: boolean;
}

export const Intake: React.FC<IntakeProps> = ({ onComplete, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Create a lightweight reference to the file
      const objectUrl = URL.createObjectURL(selected);
      setPreviewUrl(objectUrl);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default form submission just in case
    e.stopPropagation();
    if (file) {
      onComplete(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-2xl shadow-xl shadow-stone-200 border border-stone-100 overflow-hidden">
        <div className="p-8 border-b border-stone-100 bg-stone-50/50">
          <h2 className="text-2xl font-bold text-[#9a4430] mb-2 font-serif">Étape 1 : Importation</h2>
          <p className="text-stone-500">
            Importez votre photo. Vous définirez ensuite les zones à retoucher.
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Image Upload Area */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
                <label className="block text-sm font-semibold text-stone-700">Photo à traiter</label>
                {previewUrl && !isLoading && (
                     <button 
                        type="button"
                        onClick={handleReset}
                        className="text-xs flex items-center gap-1 text-stone-500 hover:text-stone-800 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                     >
                        <RotateCcw size={14} /> Changer d'image
                     </button>
                )}
            </div>

            <div className={`relative w-full rounded-xl overflow-hidden transition-all text-center select-none
                ${previewUrl ? 'border border-stone-200 bg-stone-900' : 'border-2 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 p-12'}`}
            >
              {!previewUrl && (
                 <>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        disabled={isLoading}
                    />
                    <div className="space-y-4 pointer-events-none">
                        <div className="mx-auto h-12 w-12 text-stone-400 flex items-center justify-center rounded-full bg-white border border-stone-200 shadow-sm">
                            <Upload size={24} />
                        </div>
                        <div className="text-stone-500">
                            <span className="text-[#9a4430] font-semibold">Cliquez pour importer</span> ou glissez-déposez
                        </div>
                        <p className="text-xs text-stone-400">JPG, PNG (Max 10MB)</p>
                    </div>
                 </>
              )}

              {previewUrl && (
                <div className="relative flex items-center justify-center bg-stone-100 min-h-[300px]">
                    <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className={`max-h-[50vh] max-w-full object-contain shadow-sm transition-opacity duration-300 ${isLoading ? 'opacity-50 blur-sm' : 'opacity-100'}`} 
                    />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                                <Loader2 className="animate-spin text-[#9a4430]" size={20} />
                                <span className="text-stone-800 font-medium">Optimisation...</span>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end pt-4">
            <button
              type="button" // CRUCIAL: Prevents form submission
              onClick={handleSubmit}
              disabled={!file || isLoading}
              className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-white shadow-lg transition-all
                ${!file || isLoading 
                  ? 'bg-stone-300 cursor-not-allowed opacity-70' 
                  : 'bg-[#9a4430] hover:bg-[#823927] hover:scale-[1.01] shadow-[#9a4430]/20'}`}
            >
              {isLoading ? (
                <>
                    <Loader2 className="animate-spin" size={20} />
                    Traitement en cours...
                </>
              ) : (
                <>
                    Passer à l'édition (Crayons)
                    <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
