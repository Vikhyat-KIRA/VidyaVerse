'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Paperclip, Trash2, FileText } from 'lucide-react';
import { type ChatMessage } from '@/lib/gemini';
import VayuOrb from './VayuOrb';

interface ChatPanelProps {
  userUid: string;
  userName: string;
}

interface AttachedFile {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

export default function ChatPanel({ userUid, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `🔥 **Yo ${userName}! Welcome to VidyaVerse!**\n\nI'm VAYU — your AI study buddy, mentor, and the voice in your head that won't let you slack off.\n\nHere's what I can do:\n- 💬 Answer ANY academic question\n- 📄 Read PDFs, Word docs, and PowerPoints\n- 📸 Analyze textbook pages & circuits (use Flash-Forge)\n- ⏱️ Keep you focused with the Pomodoro Coach\n\n*So what are we working on today? Drop a question or a document and let's get started!*`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (isLoading || (!input.trim() && !attachedFile)) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim() + (attachedFile ? `\n[Attached File: ${attachedFile.file.name}]` : ''),
      imageUrl: attachedFile?.previewUrl || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    const currentAttachment = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('uid', userUid);
      formData.append('message', currentInput || (currentAttachment ? `Please analyze this attached file: ${currentAttachment.file.name}` : ''));
      if (currentAttachment) {
        formData.append('file', currentAttachment.file);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      // Add placeholder message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }]);

      setIsLoading(false);
      setIsStreaming(true);
      
      const decoder = new TextDecoder();
      let streamedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        streamedResponse += text;
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = streamedResponse;
          return newMessages;
        });
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Oops, had a hiccup analyzing that. Try again!',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFile({
          file,
          previewUrl: ev.target?.result as string,
          isImage: true
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile({
        file,
        previewUrl: null,
        isImage: false
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <VayuOrb size="sm" isSpeaking={isLoading || isStreaming} isThinking={isLoading} />
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
            VAYU
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {isLoading ? '✨ Reading document...' : isStreaming ? '🟢 Speaking...' : '🟢 Online • Your AI Mentor'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3"
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(108,99,255,0.1))'
                    : 'var(--surface)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(108,99,255,0.2)' : 'var(--border-color)'}`,
                }}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Attached"
                    className="w-full max-h-[150px] object-contain rounded-lg mb-2"
                    style={{ background: 'rgba(0,0,0,0.2)' }}
                  />
                )}
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden"
                  style={{ color: 'var(--foreground)' }}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
                <span className="text-[10px] block mt-1.5" style={{ color: 'var(--muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="glass-card px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#6c63ff' }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>VAYU is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attached File Preview */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-2"
          >
            <div className="relative inline-flex items-center gap-3 p-2 rounded-xl" style={{ border: '1px solid var(--border-color)', background: 'var(--surface)' }}>
              {attachedFile.isImage && attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Attached"
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108, 99, 255, 0.2)', color: '#6c63ff' }}>
                  <FileText size={24} />
                </div>
              )}
              <div className="pr-6">
                <p className="text-sm font-bold truncate max-w-[200px]">{attachedFile.file.name}</p>
                <p className="text-xs text-[var(--muted)]">{(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="absolute -top-2 -right-2 p-1 rounded-full"
                style={{ background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div
        className="flex items-end gap-2 pt-3"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-50"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
          title="Upload Document or Image"
        >
          <Paperclip size={18} />
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
          className="hidden"
          onChange={handleFileAttach}
        />
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? "VAYU is analyzing..." : "Ask VAYU anything..."}
            rows={1}
            className="input-glass resize-none pr-12 text-sm disabled:opacity-50"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={isLoading || isStreaming || (!input.trim() && !attachedFile)}
          className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            color: 'white',
            border: 'none',
            cursor: isLoading || isStreaming ? 'wait' : 'pointer',
          }}
        >
          {isLoading || isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </motion.button>
      </div>
    </div>
  );
}
