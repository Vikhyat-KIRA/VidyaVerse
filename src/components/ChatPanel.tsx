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

interface LocalChatMessage extends ChatMessage {
  replyToContent?: string;
  replyToRole?: 'user' | 'assistant';
}

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
      content: `🔥 **Yo ${userName}! Welcome to VidyaVerse!**\n\nI'm VAYU — your AI study buddy, mentor, and the voice in your head that won't let you slack off.\n\nHere's what we can accomplish in this workspace:\n- 💬 Resolve any academic hurdles instantly\n- 📄 Audit textbook materials, lecture slides, and notes\n- 📸 Forge flashcards from visual equations (via Flash-Forge)\n- ⏱️ Force productive sprints in Pomodoro Co-op\n\n*Drop a question or attach your study files below and let's get after it!*`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
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
        content: '⚠️ Oops, encountered a stream glitch. Let&apos;s try again!',
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
    <div className="h-full flex flex-col w-full relative bg-transparent overflow-hidden">
      {/* ── Dynamic Header ── */}
      <div className="flex items-center gap-3 py-3 px-4 shrink-0 border-b border-sys-groove bg-zinc-950/10">
        <VayuOrb size="sm" isSpeaking={isLoading || isStreaming} isThinking={isLoading} />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white tracking-tight">VAYU AI Mentor</h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-zinc-500">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading || isStreaming ? 'bg-amber-500 animate-pulse-dot' : 'bg-emerald-500'}`} />
            <span>{isLoading ? 'ANALYZING CONTEXT...' : isStreaming ? 'STREAMS COMMITTED' : 'SYSTEM LINK ACTIVE'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/20 text-[9px] font-mono font-bold text-purple-400">
          <Sparkles size={10} /> GEMINI_1.5_PRO
        </div>
      </div>

      {/* ── High Density Flat Block Messages ── */}
      <div 
        className="flex-1 overflow-y-auto py-4 px-4 space-y-4 no-scrollbar bg-black/10"
        onClick={() => setActiveMsgIdx(null)}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isActive = activeMsgIdx === idx;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={idx}
                className="group relative flex gap-3.5 items-start py-3 border-b border-sys-groove/30 hover:bg-zinc-900/10 px-2 rounded-[2px] transition-colors duration-150"
                onMouseEnter={() => setActiveMsgIdx(idx)}
                onMouseLeave={() => setActiveMsgIdx(null)}
              >
                {/* 1. Square Avatar Block */}
                <div className={`w-8 h-8 rounded-[4px] flex-shrink-0 flex items-center justify-center font-mono font-bold text-xs select-none border border-sys-groove ${
                  isUser 
                    ? 'bg-purple-950/40 text-purple-400 border-purple-500/20' 
                    : 'bg-zinc-900 text-zinc-300'
                }`}>
                  {isUser ? userName.substring(0, 2).toUpperCase() : 'V'}
                </div>

                {/* 2. Message Body */}
                <div className="flex-1 min-w-0">
                  {/* Metadata Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${isUser ? 'text-purple-400' : 'text-zinc-300'}`}>
                      {isUser ? userName : 'VAYU AI'}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">{timeStr}</span>
                  </div>

                  {/* Quoted Thread */}
                  {msg.replyToContent && (
                    <div className="mb-2 px-2.5 py-1.5 rounded-[2px] bg-zinc-950/40 border-l-2 border-purple-500 text-[10px] text-zinc-500 max-w-xl">
                      <p className="font-bold text-purple-400 mb-0.5">{msg.replyToRole === 'assistant' ? 'VAYU' : userName}</p>
                      <p className="truncate italic">
                        {msg.replyToContent.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>
                    </div>
                  )}

                  {/* Image attachment inside block */}
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Telemetry Attachment"
                      className="w-48 max-h-36 object-contain rounded border border-sys-groove bg-zinc-950 mb-2"
                    />
                  )}

                  {/* Text Content */}
                  <div 
                    className="text-xs text-zinc-300 leading-relaxed break-words chat-content select-text"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>

                {/* Reply control trigger (tactical corner button) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo({ idx, content: msg.content, role: msg.role });
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded bg-zinc-900 border border-sys-groove hover:text-zinc-300 text-zinc-500 cursor-pointer spring-transition"
                  title="Reply to message"
                >
                  <CornerUpLeft size={10} />
                </button>
              </div>
            );
          })}
        </AnimatePresence>

        {/* Streaming Loader */}
        {isLoading && (
          <div className="flex gap-3.5 items-start py-3 px-2">
            <div className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-sys-groove flex-shrink-0 flex items-center justify-center font-mono font-bold text-xs text-zinc-500">
              V
            </div>
            <div className="flex-1 py-1">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-500"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Attachment Preview ── */}
      <AnimatePresence>
        {attachedFile && (
          <div className="px-4 py-2 border-t border-sys-groove bg-zinc-950/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {attachedFile.isImage && attachedFile.previewUrl ? (
                <img src={attachedFile.previewUrl} className="h-8 w-8 rounded object-cover border border-sys-groove" />
              ) : (
                <FileText size={16} className="text-purple-400" />
              )}
              <span className="text-[10px] font-mono text-zinc-300 truncate max-w-xs">{attachedFile.file.name}</span>
            </div>
            <button 
              onClick={() => setAttachedFile(null)}
              className="text-xs text-rose-500 hover:text-rose-400 border-none bg-transparent cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* ── Skeuomorphic Rigid Input Dock (Zone 3A Bottom) ── */}
      <div className="w-full min-h-[56px] bg-zinc-950/40 border-t border-sys-groove px-4 py-2 flex flex-col justify-center gap-1.5 select-none relative shrink-0">
        
        {/* Reply focus bar */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-purple-950/20 border border-purple-500/20 px-2 py-1 rounded text-[10px] text-purple-300">
            <div className="flex items-center gap-1.5 truncate">
              <CornerUpLeft size={10} />
              <span>Replying to {replyingTo.role === 'assistant' ? 'VAYU' : userName}:</span>
              <span className="opacity-60 truncate italic">{replyingTo.content.substring(0, 60)}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300 border-none bg-transparent cursor-pointer">
              <X size={10} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          {/* File Clip Trigger */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-10 w-10 rounded-[4px] bg-zinc-900 border border-sys-groove hover:bg-zinc-800/40 flex items-center justify-center text-zinc-500 hover:text-zinc-300 cursor-pointer spring-transition active:scale-95 disabled:opacity-30"
            title="Attach file"
          >
            <Paperclip size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={handleFileAttach}
          />

          {/* Text Input area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? 'VAYU IS AUDITING MATERIALS...' : 'ASK VAYU ANYTHING...'}
              rows={1}
              className="w-full bg-zinc-900/40 border border-sys-groove p-2 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 resize-none custom-scrollbar font-sans"
              style={{ minHeight: '40px', maxHeight: '100px', paddingTop: '10px' }}
            />
          </div>

          {/* Send Trigger */}
          <button
            onClick={handleSend}
            disabled={isLoading || isStreaming || (!input.trim() && !attachedFile)}
            className="h-10 w-10 rounded-[4px] bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-pointer disabled:opacity-30 spring-transition active:scale-95 shrink-0"
            title="Send query"
          >
            {isLoading || isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
