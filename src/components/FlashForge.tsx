'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, ImageIcon, Zap, Eye, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeImageWithVayu } from '@/lib/gemini';
import { saveToVault } from '@/lib/vault';
import { awardXp } from '@/lib/exp';
import { useToast } from '@/components/Toast';

interface FlashForgeProps {
  userUid: string;
}

export default function FlashForge({ userUid }: FlashForgeProps) {
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [context, setContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image study materials are accepted currently.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleAnalyze = async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true);
    try {
      const base64 = uploadedImage.split(',')[1];
      const result = await analyzeImageWithVayu(userUid, base64, context || undefined);
      setAnalysis(result);
      setIsSaved(false);
      await awardXp(userUid, 15); // +15 XP for uploading!
      toast.success('✨ Analysis complete! +15 XP');
    } catch {
      setAnalysis('⚠️ OCR/Vision stream aborted. Please re-try.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!analysis) return;
    setIsSaving(true);
    try {
      await saveToVault(userUid, analysis);
      setIsSaved(true);
      toast.success('Information securely locked into memory vault');
    } catch (err) {
      console.error('Failed to save to vault:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setAnalysis(null);
    setContext('');
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex justify-between items-center border-b border-sys-groove pb-3 mb-4 bg-zinc-950/10 p-3 rounded-[4px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 border border-sys-groove text-purple-400 rounded-[4px]">
            <Zap size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">Forge Analysis Chamber</h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">VISION OCR & EXPLANATION CORE</p>
          </div>
        </div>
      </div>

      {/* 2. Content view */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
        {!uploadedImage ? (
          /* Rigid Upload block */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full min-h-[220px] flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900/10 border-2 border-dashed rounded-[4px] cursor-pointer spring-transition ${
              isDragging ? 'border-purple-500 bg-purple-950/5' : 'border-sys-groove hover:border-zinc-800'
            }`}
          >
            <div className="w-12 h-12 bg-zinc-950 border border-sys-groove flex items-center justify-center text-zinc-400 rounded">
              <Upload size={20} className={isDragging ? 'text-purple-400 animate-bounce' : 'text-zinc-500'} />
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-zinc-200">
                {isDragging ? 'DROP STUDY MATERIAL' : 'UPLOAD SCHEMATICS & EQUATIONS'}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-xs mx-auto">
                Drag diagrams, formulas, slides, or notebook screenshots. VAYU will extract and formulate study insights.
              </p>
            </div>

            <span className="text-[9px] font-mono text-zinc-600">PNG, JPG, WEBP SUPPORTED</span>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          /* Preview state */
          <div className="space-y-4">
            {/* Image Box */}
            <div className="relative rounded-[4px] overflow-hidden border border-sys-groove bg-zinc-950 p-2">
              <img
                src={uploadedImage}
                alt="Studying schema"
                className="w-full max-h-[160px] object-contain rounded"
              />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 p-1.5 rounded bg-zinc-950 border border-sys-groove text-zinc-400 hover:text-white cursor-pointer spring-transition"
                title="Discard image"
              >
                <X size={12} />
              </button>
            </div>

            {/* Context manual note */}
            <div>
              <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">
                Target Concepts / Context
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Chapter 4 mechanics, Ohm&apos;s law formula review..."
                className="w-full bg-zinc-900/60 border border-sys-groove p-2 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-mono font-bold uppercase text-white rounded-[4px] cursor-pointer spring-transition mechanical-press flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  INITIATING OCR STREAMING...
                </>
              ) : (
                <>
                  <Eye size={13} />
                  FORGE INSIGHTS FROM DIAGRAM
                </>
              )}
            </button>

            {/* Output terminal */}
            <AnimatePresence>
              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-zinc-900 border border-sys-groove rounded-[4px] relative"
                >
                  <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] font-bold border-b border-sys-groove/40 pb-2 mb-3">
                    <Zap size={12} className="animate-pulse" />
                    DECRPYTED OCR TELEMETRY
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap mb-4 break-words select-text">
                    {analysis}
                  </p>

                  <button
                    onClick={handleSaveToVault}
                    disabled={isSaving || isSaved}
                    className={`w-full py-2 border text-[10px] font-mono font-bold uppercase rounded-[4px] cursor-pointer spring-transition flex items-center justify-center gap-1.5 ${
                      isSaved
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-950 border-sys-groove text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {isSaving ? (
                      <><Loader2 size={12} className="animate-spin" /> LOCKING MEMORY...</>
                    ) : isSaved ? (
                      <><CheckCircle2 size={12} /> SECURED IN MEMORY VAULT</>
                    ) : (
                      <><Database size={12} /> LOCK IN MEMORY VAULT</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
