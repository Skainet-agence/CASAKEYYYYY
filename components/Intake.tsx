import React, { useState } from 'react';
import { Upload, ArrowRight, RotateCcw, Image as ImageIcon } from 'lucide-react';

interface IntakeProps {
  onComplete: (file: File, request: string) => void;
  isLoading: boolean;
}

export const Intake: React.FC<IntakeProps> = ({ onComplete, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [request, setRequest] = useState('');

  // 1. Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImageSrc(null);
  };

  const handleSubmit = () => {
    if (file && request) {
      onComplete(file, request);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-xl shadow-stone-200 border border-stone-100 overflow-hidden">
        <div className="p-8 border-b border-stone-100 bg-stone-50/50">
          <h2 className="text-2xl font-bold text-[#9a4430] mb-2 font-serif">Étape A : Importation & Instructions</h2>
          <p className="text-stone-500">
            Importez votre photo et décrivez les corrections souhaitées. L'IA analysera la scène pour structurer l'intervention.
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Image Upload Area */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
                <label className="block text-sm font-semibold text-stone-700">Photo à traiter</label>
                {imageSrc && (
                     <button 
                        onClick={handleReset}
                        className="text-xs flex items-center gap-1 text-stone-500 hover:text-stone-800 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                     >
                        <RotateCcw size={14} /> Changer d'image
                     </button>
                )}
            </div>

            <div className={`relative w-full rounded-xl overflow-hidden transition-all text-center select-none
                ${imageSrc ? 'border border-stone-200 bg-stone-900' : 'border-2 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 p-12'}`}
            >
              {!imageSrc && (
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

              {imageSrc && (
                <div className="relative flex items-center justify-center bg-stone-100 min-h-[300px]">
                    <img 
                        src={imageSrc} 
                        alt="Preview" 
                        className="max-h-[50vh] max-w-full object-contain shadow-sm" 
                    />
                </div>
              )}
            </div>
          </div>

          {/* Request Input */}
          <div className="space-y-4">
            <label htmlFor="request" className="block text-sm font-semibold text-stone-700">
              Demande de correction
            </label>
            <textarea
              id="request"
              rows={3}
              className="block w-full rounded-lg border-stone-300 bg-white text-stone-800 shadow-sm focus:border-[#9a4430] focus:ring-[#9a4430] sm:text-sm p-4 placeholder-stone-400"
              placeholder="ex: Enlève la poubelle, change le ciel en bleu, lisse les draps..."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Action */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmit}
              disabled={!file || !request || isLoading}
              className={`flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-white shadow-lg transition-all
                ${!file || !request || isLoading 
                  ? 'bg-stone-300 cursor-not-allowed opacity-70' 
                  : 'bg-[#9a4430] hover:bg-[#823927] hover:scale-[1.01] shadow-[#9a4430]/20'}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Traitement...
                </>
              ) : (
                <>
                  Analyser & Corriger
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