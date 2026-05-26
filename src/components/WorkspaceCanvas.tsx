'use client';

import { ReactNode } from 'react';
import { ActivePanel } from './UtilityDock';
import { 
  MessageSquare, Users, Layers, Zap, Timer, Swords, Settings, ChevronRight
} from 'lucide-react';

interface WorkspaceCanvasProps {
  activePanel: ActivePanel;
  children: ReactNode;
  activeRoomName?: string;
  activeLeitnerBox?: number | null;
}

export default function WorkspaceCanvas({
  activePanel,
  children,
  activeRoomName,
  activeLeitnerBox,
}: WorkspaceCanvasProps) {
  
  // Construct dynamic breadcrumb text
  const getBreadcrumbs = () => {
    const rootIcon = {
      chat: <MessageSquare size={12} className="text-purple-400" />,
      community: <Users size={12} className="text-purple-400" />,
      flashcards: <Layers size={12} className="text-purple-400" />,
      flashforge: <Zap size={12} className="text-purple-400" />,
      pomodoro: <Timer size={12} className="text-purple-400" />,
      bossbattle: <Swords size={12} className="text-purple-400" />,
      settings: <Settings size={12} className="text-purple-400" />,
    }[activePanel];

    const rootLabel = {
      chat: 'VAYU Chat',
      community: 'Tactical Net',
      flashcards: 'Leitner Deck',
      flashforge: 'Forge Terminal',
      pomodoro: 'Focus Control',
      bossbattle: 'Combat Log',
      settings: 'Systems Config',
    }[activePanel];

    let subLabel = '';
    if (activePanel === 'community' && activeRoomName) {
      subLabel = activeRoomName;
    } else if (activePanel === 'flashcards') {
      subLabel = activeLeitnerBox ? `Box ${activeLeitnerBox}` : 'Due Reviews';
    } else {
      subLabel = 'Primary Stream';
    }

    return (
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
        <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-900 border border-sys-groove">
          {rootIcon}
        </span>
        <span className="font-bold text-zinc-300">{rootLabel}</span>
        <ChevronRight size={10} className="text-zinc-600" />
        <span className="text-zinc-500 font-semibold">{subLabel}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-panel-graphite relative overflow-hidden select-none">
      {/* 1. Tactical Canvas Breadcrumb Bar */}
      <div className="h-14 border-b border-sys-groove px-4 flex items-center justify-between chamfered-edge bg-zinc-950/10">
        {getBreadcrumbs()}
        
        {/* Connection status telemetry */}
        <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
            <span>GRID_OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>AI_LINK_ONLINE</span>
          </div>
        </div>
      </div>

      {/* 2. Embedded view slot */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
