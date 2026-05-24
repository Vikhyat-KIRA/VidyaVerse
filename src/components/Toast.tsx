'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const VARIANT_CONFIG = {
  success: {
    icon: <CheckCircle2 size={15} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  error: {
    icon: <XCircle size={15} />,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.25)',
  },
  info: {
    icon: <Info size={15} />,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.25)',
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
    setToasts(prev => [...prev.slice(-3), { id, message, variant }]); // max 4 toasts
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
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 340 }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const cfg = VARIANT_CONFIG[toast.variant];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 40, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl pointer-events-auto"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  color: 'var(--foreground)',
                }}
              >
                <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>
                  {cfg.icon}
                </span>
                <p className="text-xs font-medium leading-relaxed flex-1">{toast.message}</p>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-1 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
