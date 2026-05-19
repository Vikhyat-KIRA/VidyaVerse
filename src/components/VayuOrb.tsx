'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface VayuOrbProps {
  isSpeaking?: boolean;
  isThinking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function VayuOrb({ 
  isSpeaking = false, 
  isThinking = false, 
  size = 'md',
  onClick 
}: VayuOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  const sizeMap = { sm: 80, md: 140, lg: 200 };
  const orbSize = sizeMap[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = orbSize * dpr;
    canvas.height = orbSize * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const draw = () => {
      time += 0.02;
      ctx.clearRect(0, 0, orbSize, orbSize);

      const cx = orbSize / 2;
      const cy = orbSize / 2;
      const baseRadius = orbSize * 0.28;

      // Outer glow rings
      for (let i = 3; i >= 0; i--) {
        const glowRadius = baseRadius + i * 12 + (isSpeaking ? Math.sin(time * 4 + i) * 8 : Math.sin(time + i) * 3);
        const alpha = 0.04 - i * 0.008;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        gradient.addColorStop(0, `rgba(108, 99, 255, ${alpha + 0.02})`);
        gradient.addColorStop(0.5, `rgba(0, 240, 255, ${alpha})`);
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Core orb with morphing shape
      const points = 64;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const speakingNoise = isSpeaking
          ? Math.sin(angle * 6 + time * 8) * 4 + Math.sin(angle * 10 + time * 12) * 2.5
          : 0;
        const thinkingNoise = isThinking
          ? Math.sin(angle * 3 + time * 3) * 3 + Math.cos(angle * 5 + time * 2) * 2
          : 0;
        const baseNoise = Math.sin(angle * 4 + time * 1.5) * 1.5 + Math.cos(angle * 3 + time) * 1;
        const r = baseRadius + baseNoise + speakingNoise + thinkingNoise;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Core gradient
      const coreGradient = ctx.createRadialGradient(
        cx - baseRadius * 0.3, cy - baseRadius * 0.3, 0,
        cx, cy, baseRadius * 1.2
      );
      coreGradient.addColorStop(0, 'rgba(180, 170, 255, 0.95)');
      coreGradient.addColorStop(0.3, 'rgba(108, 99, 255, 0.85)');
      coreGradient.addColorStop(0.6, 'rgba(80, 60, 220, 0.75)');
      coreGradient.addColorStop(1, 'rgba(0, 180, 255, 0.6)');
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Inner highlight
      const hlGradient = ctx.createRadialGradient(
        cx - baseRadius * 0.2, cy - baseRadius * 0.25, 0,
        cx, cy, baseRadius * 0.6
      );
      hlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      hlGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hlGradient;
      ctx.fill();

      // Floating particles
      for (let i = 0; i < 12; i++) {
        const pAngle = (i / 12) * Math.PI * 2 + time * 0.5;
        const pDist = baseRadius + 18 + Math.sin(time * 2 + i * 0.8) * 8;
        const px = cx + Math.cos(pAngle) * pDist;
        const py = cy + Math.sin(pAngle) * pDist;
        const pSize = 1 + Math.sin(time * 3 + i) * 0.8;
        const pAlpha = 0.3 + Math.sin(time * 2 + i * 1.3) * 0.2;
        
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 
          ? `rgba(108, 99, 255, ${pAlpha})`
          : `rgba(0, 240, 255, ${pAlpha})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [orbSize, isSpeaking, isThinking]);

  return (
    <div className="relative flex items-center justify-center" onClick={onClick}>
      <AnimatePresence>
        {(isSpeaking || hovered) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute rounded-full"
            style={{
              width: orbSize * 1.6,
              height: orbSize * 1.6,
              background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className="cursor-pointer relative"
        animate={isThinking ? { 
          rotate: [0, 2, -2, 0],
        } : {}}
        transition={isThinking ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        <canvas
          ref={canvasRef}
          style={{ width: orbSize, height: orbSize }}
          className="drop-shadow-2xl"
        />

        {/* Status indicator */}
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isSpeaking ? '#00f0ff' : isThinking ? '#fbbf24' : '#34d399',
            }}
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            {isSpeaking ? 'Speaking' : isThinking ? 'Thinking' : 'Ready'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
