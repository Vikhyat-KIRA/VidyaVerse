'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, ImageIcon, Zap, Eye, Database, CheckCircle2 } from 'lucide-react';
import { analyzeImageWithVayu } from '@/lib/gemini';
import { saveToVault } from '@/lib/vault';

interface FlashForgeProps {
  userUid: string;
}

export default function FlashForge({ userUid }: FlashForgeProps) {
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
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }, []);

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
    } catch {
      setAnalysis('⚠️ Analysis failed. Please try again.');
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(0, 240, 255, 0.1)' }}>
          <Zap size={20} style={{ color: '#00f0ff' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            Flash-Forge
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Vision OCR • AI Analysis
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="wait">
          {!uploadedImage ? (
            /* Drop Zone */
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`drop-zone flex flex-col items-center justify-center gap-4 min-h-[240px] ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <motion.div
                animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="p-4 rounded-2xl" style={{ 
                  background: isDragging ? 'rgba(0, 240, 255, 0.15)' : 'rgba(108, 99, 255, 0.1)',
                  transition: 'all 0.3s ease',
                }}>
                  <Upload size={32} style={{ color: isDragging ? '#00f0ff' : '#6c63ff' }} />
                </div>
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  {isDragging ? 'Drop it here!' : 'Drop your study material'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Textbook pages, circuits, diagrams — VAYU will break it down
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <ImageIcon size={12} />
                <span>PNG, JPG, WEBP up to 10MB</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </motion.div>
          ) : (
            /* Image Preview & Analysis */
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                <img
                  src={uploadedImage}
                  alt="Uploaded study material"
                  className="w-full max-h-[200px] object-contain"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <X size={14} style={{ color: 'white' }} />
                </button>
              </div>

              {/* Context Input */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
                  Add context (optional)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., Chapter 5, Ohm's Law, Page 42..."
                  className="input-glass text-sm"
                />
              </div>

              {/* Analyze Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: isAnalyzing 
                    ? 'rgba(108, 99, 255, 0.3)' 
                    : 'linear-gradient(135deg, #6c63ff, #00f0ff)',
                  color: 'white',
                  border: 'none',
                  cursor: isAnalyzing ? 'wait' : 'pointer',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    VAYU is analyzing...
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Analyze with Flash-Forge
                  </>
                )}
              </motion.button>

              {/* Analysis Result */}
              <AnimatePresence>
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} style={{ color: '#00f0ff' }} />
                      <span className="text-xs font-bold" style={{ color: '#00f0ff' }}>
                        VAYU ANALYSIS
                      </span>
                    </div>
                    <div 
                      className="text-sm leading-relaxed whitespace-pre-wrap mb-4 break-words"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {analysis}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveToVault}
                      disabled={isSaving || isSaved}
                      className="w-full py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: isSaved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(108, 99, 255, 0.15)',
                        color: isSaved ? '#34d399' : '#6c63ff',
                        border: `1px solid ${isSaved ? 'rgba(52, 211, 153, 0.3)' : 'rgba(108, 99, 255, 0.3)'}`,
                        cursor: (isSaving || isSaved) ? 'default' : 'pointer',
                      }}
                    >
                      {isSaving ? (
                        <><Loader2 size={14} className="animate-spin" /> Saving...</>
                      ) : isSaved ? (
                        <><CheckCircle2 size={14} /> Saved to Memory Vault</>
                      ) : (
                        <><Database size={14} /> Save to Memory Vault</>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
