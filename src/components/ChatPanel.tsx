'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Paperclip, Trash2, FileText, Sparkles, CornerUpLeft, X } from 'lucide-react';
import { type ChatMessage } from '@/lib/gemini';
import VayuOrb from './VayuOrb';

interface ChatPanelProps {
  userUid: string;
  userName: string;
  onResponseComplete?: (text: string) => void;
}

interface AttachedFile {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

// Local extension of ChatMessage to support reply threading
interface LocalChatMessage extends ChatMessage {
  replyToContent?: string;
  replyToRole?: 'user' | 'assistant';
}

// ─── Markdown renderer helper ────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{3}\s(.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^#{2}\s(.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^#{1}\s(.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/^[-*]\s(.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li[\s\S]*<\/li>)/, '<ul class="md-ul">$1</ul>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPanel({ userUid, userName, onResponseComplete }: ChatPanelProps) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([
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
  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ idx: number; content: string; role: 'user' | 'assistant' } | null>(null);
  const [activeMsgIdx, setActiveMsgIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const handleSend = async () => {
    if (isLoading || (!input.trim() && !attachedFile)) return;

    const replyMeta = replyingTo
      ? { replyToContent: replyingTo.content, replyToRole: replyingTo.role }
      : {};

    const userMessage: LocalChatMessage = {
      role: 'user',
      content: input.trim() + (attachedFile ? `\n[Attached File: ${attachedFile.file.name}]` : ''),
      imageUrl: attachedFile?.previewUrl || undefined,
      timestamp: Date.now(),
      ...replyMeta,
    };

    setMessages(prev => [...prev, userMessage]);
    setReplyingTo(null);
    setActiveMsgIdx(null);

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
      } as LocalChatMessage]);

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

      if (onResponseComplete) {
        onResponseComplete(streamedResponse);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Oops, had a hiccup. Please try again!',
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
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 pb-3 mb-1"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <VayuOrb size="sm" isSpeaking={isLoading || isStreaming} isThinking={isLoading} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            VAYU
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: isLoading ? '#f59e0b' : isStreaming ? '#06b6d4' : '#10b981',
                boxShadow: `0 0 6px ${isLoading ? '#f59e0b' : isStreaming ? '#06b6d4' : '#10b981'}`,
              }}
            />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {isLoading ? 'Reading document…' : isStreaming ? 'Composing reply…' : 'Online · Your AI Mentor'}
            </p>
          </div>
        </div>
        {/* Subtle branding */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <Sparkles size={11} style={{ color: 'var(--primary)' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--primary)', letterSpacing: '0.04em' }}>
            Gemini
          </span>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto py-3 space-y-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
        onClick={() => setActiveMsgIdx(null)}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const m = msg as LocalChatMessage;
            const isUser = m.role === 'user';
            const isActive = activeMsgIdx === idx;
            const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const replyBtn = (
              <motion.button
                initial={false}
                animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.75 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo({ idx, content: m.content, role: m.role });
                  setActiveMsgIdx(null);
                }}
                className="self-end flex-shrink-0 p-2 rounded-full mb-5"
                style={{
                  background: 'rgba(99,102,241,0.14)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
                title="Reply"
                aria-label="Reply to this message"
              >
                <CornerUpLeft size={13} />
              </motion.button>
            );

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={`flex gap-1.5 items-end ${isUser ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setActiveMsgIdx(idx)}
                onMouseLeave={() => setActiveMsgIdx(null)}
                onClick={(e) => { e.stopPropagation(); setActiveMsgIdx(prev => prev === idx ? null : idx); }}
              >
                {/* AI avatar (left) */}
                {!isUser && (
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                      color: 'white',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.15)',
                    }}
                  >
                    V
                  </div>
                )}

                {/* Reply button — left of user bubble */}
                {isUser && replyBtn}

                <div
                  className="max-w-[85%] sm:max-w-[82%] rounded-2xl"
                  style={
                    isUser
                      ? {
                          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          padding: '10px 14px',
                          boxShadow: '0 2px 12px rgba(99, 102, 241, 0.25), 0 1px 3px rgba(0,0,0,0.2)',
                          borderBottomRightRadius: '4px',
                        }
                      : {
                          background: 'var(--surface)',
                          border: '1px solid var(--border-color)',
                          padding: '10px 14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
                          borderBottomLeftRadius: '4px',
                        }
                  }
                >
                  {/* Quoted reply bubble */}
                  {m.replyToContent && (
                    <div
                      className="mb-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: isUser ? 'rgba(255,255,255,0.13)' : 'rgba(99,102,241,0.08)',
                        borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.55)' : 'var(--primary)'}`,
                      }}
                    >
                      <p
                        className="text-[10px] font-bold mb-0.5"
                        style={{ color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--primary)' }}
                      >
                        {m.replyToRole === 'assistant' ? 'VAYU' : userName}
                      </p>
                      <p
                        className="text-[11px] leading-snug"
                        style={{
                          color: isUser ? 'rgba(255,255,255,0.65)' : 'var(--muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        // Strip markdown for clean preview
                        dangerouslySetInnerHTML={{ __html: m.replyToContent.replace(/<[^>]*>/g, '').substring(0, 120) }}
                      />
                    </div>
                  )}

                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="Attached"
                      className="w-full max-h-[160px] object-contain rounded-xl mb-2.5"
                      style={{ background: 'rgba(0,0,0,0.2)' }}
                    />
                  )}
                  <div
                    className="text-sm leading-relaxed break-words chat-content"
                    style={{ color: isUser ? 'rgba(255,255,255,0.95)' : 'var(--foreground)' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                  <span
                    className="text-[9px] block mt-1.5 select-none"
                    style={{ color: isUser ? 'rgba(255,255,255,0.45)' : 'var(--muted)', opacity: 0.7 }}
                  >
                    {timeStr}
                  </span>
                </div>

                {/* Reply button — right of AI bubble */}
                {!isUser && replyBtn}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 justify-start"
          >
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: 'white',
              }}
            >
              V
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-md"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--primary)' }}
                    animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Attached File Preview ────────────────────────────── */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-2"
          >
            <div
              className="relative inline-flex items-center gap-2.5 py-2 pl-2.5 pr-8 rounded-xl"
              style={{ border: '1px solid var(--border-color)', background: 'var(--surface)' }}
            >
              {attachedFile.isImage && attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Attached"
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}
                >
                  <FileText size={18} />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold truncate max-w-[180px]" style={{ color: 'var(--foreground)' }}>
                  {attachedFile.file.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full"
                style={{ background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={9} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Area ───────────────────────────────────────── */}
      <div
        className="flex flex-col gap-0 pt-2.5"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        {/* Reply bar */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderLeft: '3px solid var(--primary)',
              }}
            >
              <CornerUpLeft size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                  Replying to {replyingTo.role === 'assistant' ? 'VAYU' : userName}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                  {replyingTo.content.replace(/<[^>]*>/g, '').substring(0, 80)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                aria-label="Cancel reply"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* Attach button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Upload Document or Image"
            aria-label="Attach file"
          >
            <Paperclip size={16} />
          </motion.button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={handleFileAttach}
          />

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={replyingTo
                ? `Replying to ${replyingTo.role === 'assistant' ? 'VAYU' : userName}…`
                : (isLoading ? 'VAYU is analyzing…' : 'Ask VAYU anything…')}
              rows={1}
              className="input-glass resize-none text-sm disabled:opacity-40"
              style={{
                minHeight: '42px',
                maxHeight: '120px',
                lineHeight: '1.5',
                paddingTop: '10px',
                paddingBottom: '10px',
              }}
            />
          </div>

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
            disabled={isLoading || isStreaming || (!input.trim() && !attachedFile)}
            className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              cursor: isLoading || isStreaming ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.15s ease',
            }}
            aria-label="Send message"
          >
            {isLoading || isStreaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </motion.button>
        </div>
      </div>
    </div>
  );
}
