'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const VARIANT_CONFIG = {
  success: {
    icon: <CheckCircle2 size={13} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.05)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  error: {
    icon: <XCircle size={13} />,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.05)',
    border: 'rgba(244, 63, 94, 0.2)',
  },
  info: {
    icon: <Info size={13} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.05)',
    border: 'rgba(139, 92, 246, 0.2)',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timerMap.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMap.current.delete(id);
    }
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { id, message, variant }]); // max 3 toasts
    const timer = setTimeout(() => dismiss(id), 3500);
    timerMap.current.set(id, timer);
  }, [dismiss]);

  const ctx: ToastContextValue = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 300 }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const cfg = VARIANT_CONFIG[toast.variant];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-[4px] pointer-events-auto border font-mono select-none"
                style={{
                  background: 'rgba(12, 12, 14, 0.95)',
                  borderColor: cfg.border,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  color: '#e4e4e7',
                }}
              >
                <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1.5 }}>
                  {cfg.icon}
                </span>
                <p className="text-[10px] leading-relaxed flex-1 font-bold">{toast.message.toUpperCase()}</p>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-1 opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 border-none bg-transparent cursor-pointer text-zinc-400"
                >
                  <X size={11} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
