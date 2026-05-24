'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Trophy, Flame, Star } from 'lucide-react';

interface ScoreCardProps {
  userName: string;
  userXp: number;
  userStreak: number;
  onClose: () => void;
}

// Rank title based on XP
function getRank(xp: number): string {
  if (xp >= 5000) return 'Omniscient Scholar';
  if (xp >= 2000) return 'Knowledge Seeker';
  if (xp >= 1000) return 'Rising Scholar';
  if (xp >= 500)  return 'Curious Mind';
  if (xp >= 100)  return 'Apprentice';
  return 'Newcomer';
}

function getRankEmoji(xp: number): string {
  if (xp >= 5000) return '👑';
  if (xp >= 2000) return '🏆';
  if (xp >= 1000) return '⚡';
  if (xp >= 500)  return '🌟';
  if (xp >= 100)  return '📚';
  return '🌱';
}

export default function ScoreCard({ userName, userXp, userStreak, onClose }: ScoreCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rank = getRank(userXp);
  const rankEmoji = getRankEmoji(userXp);

  const drawCard = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    // Background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, W, H);

    // Gradient overlay
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, 'rgba(99,102,241,0.15)');
    bg.addColorStop(1, 'rgba(6,182,212,0.08)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let x = 0; x < W; x += 28) {
      for (let y = 0; y < H; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glow circle
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, 220);
    glow.addColorStop(0, 'rgba(99,102,241,0.18)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    // Inner highlight border
    ctx.strokeStyle = 'rgba(99,102,241,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // Brand — "VIDYAVERSE"
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.letterSpacing = '0.2em';
    ctx.fillText('VIDYAVERSE', 32, 44);

    // Rank emoji + title
    ctx.font = '36px system-ui';
    ctx.fillText(rankEmoji, 28, 120);

    const rankGrad = ctx.createLinearGradient(28, 130, 400, 130);
    rankGrad.addColorStop(0, '#6366f1');
    rankGrad.addColorStop(1, '#06b6d4');
    ctx.font = 'bold 22px system-ui';
    ctx.fillStyle = rankGrad;
    ctx.fillText(rank, 28, 158);

    // Username
    ctx.font = 'bold 36px system-ui';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(userName, 28, 210);

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 230);
    ctx.lineTo(W - 28, 230);
    ctx.stroke();

    // XP stat
    const xpGrad = ctx.createLinearGradient(28, 0, 200, 0);
    xpGrad.addColorStop(0, '#6366f1');
    xpGrad.addColorStop(1, '#818cf8');
    ctx.font = 'bold 48px system-ui';
    ctx.fillStyle = xpGrad;
    ctx.fillText(userXp.toLocaleString(), 28, 295);

    ctx.font = '13px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('XP EARNED', 28, 318);

    // Streak stat
    ctx.font = 'bold 48px system-ui';
    ctx.fillStyle = '#fb923c';
    ctx.fillText(`${userStreak}🔥`, W / 2 + 20, 295);

    ctx.font = '13px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('DAY STREAK', W / 2 + 20, 318);

    // Date
    ctx.font = '11px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), 28, H - 24);

    // Right watermark
    ctx.font = 'bold 10px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'right';
    ctx.fillText('vidyaverse.vercel.app', W - 28, H - 24);
    ctx.textAlign = 'left';
  };

  const generateCanvas = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const W = 680, H = 360;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    drawCard(ctx, W, H);
    return canvas;
  };

  const handleDownload = () => {
    const canvas = generateCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `vidyaverse-${userName.toLowerCase().replace(/\s+/g, '-')}-scorecard.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    const canvas = generateCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'vidyaverse-scorecard.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `${userName}'s VidyaVerse Scorecard`,
            text: `I'm a ${rank} on VidyaVerse with ${userXp} XP and a ${userStreak}-day streak! 🔥`,
            files: [file],
          });
        } catch { /* user cancelled */ }
      } else {
        // Fallback: copy image to clipboard
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Scorecard copied to clipboard! Paste it anywhere.');
        } catch {
          handleDownload();
        }
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg"
      >
        {/* Preview */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Visual preview (HTML, mirrors canvas design) */}
          <div
            className="relative p-8 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #090a0f 0%, #0f1020 100%)', minHeight: 200 }}
          >
            {/* Dots bg */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }} />
            {/* Glow */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.15), transparent 70%)' }} />

            <div className="relative z-10">
              <p className="text-[10px] font-bold tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>VIDYAVERSE</p>

              <div className="flex items-end gap-4 mb-4">
                <div>
                  <p className="gradient-text text-lg font-bold">{rankEmoji} {rank}</p>
                  <p className="text-2xl font-extrabold" style={{ color: '#f1f5f9' }}>{userName}</p>
                </div>
              </div>

              <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

              <div className="flex gap-10">
                <div>
                  <p className="text-3xl font-extrabold gradient-text">{userXp.toLocaleString()}</p>
                  <p className="text-[10px] font-semibold tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>XP EARNED</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold" style={{ color: '#fb923c' }}>{userStreak}🔥</p>
                  <p className="text-[10px] font-semibold tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>DAY STREAK</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas for download */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Download size={15} /> Save PNG
          </button>
          <button
            onClick={handleShare}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            <Share2 size={15} /> Share
          </button>
        </div>
      </motion.div>
    </div>
  );
}
