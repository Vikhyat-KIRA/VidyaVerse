'use client';

import { useEffect, useRef } from 'react';

// ── Easing helpers ──────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeIn(t: number): number {
  return t * t * t;
}
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Animation constants ──────────────────────────────────────────────────────
const CYCLE_MS   = 10000; // 10 second loop

// Phase boundaries as 0..1 fraction of CYCLE
const P_SLOW_END  = 0.26; // slow tick phase ends
const P_ACCEL_END = 0.38; // acceleration phase ends
const P_FAST_END  = 0.76; // fast-spin phase ends
const P_DECEL_END = 0.88; // deceleration phase ends
const P_HOLD_END  = 0.94; // hold phase ends (fade starts)
const P_FADE_END  = 0.99; // fully faded — reset happens here

// Degree targets at key positions
const SEC_SLOW = 150;
const SEC_FAST = 2160;  // 6 full rotations at peak
const MIN_SLOW = 55;
const MIN_FAST = 1260;  // 3.5 full rotations
const HOR_SLOW = 10;
const HOR_FAST = 400;   // ~1.1 rotation

function getAngle(
  p: number,
  slowVal: number,
  fastVal: number,
): number {
  if (p < P_SLOW_END) {
    // Slow deliberate tick — ease-in-out
    return slowVal * easeInOut(p / P_SLOW_END);
  }
  if (p < P_ACCEL_END) {
    // Acceleration into fast spin — ease-in
    const t = (p - P_SLOW_END) / (P_ACCEL_END - P_SLOW_END);
    return lerp(slowVal, slowVal + (fastVal - slowVal) * 0.12, easeIn(t));
  }
  if (p < P_FAST_END) {
    // Fast spin body — linear (constant velocity = smoothest)
    const t = (p - P_ACCEL_END) / (P_FAST_END - P_ACCEL_END);
    return lerp(slowVal + (fastVal - slowVal) * 0.12, fastVal, t);
  }
  if (p < P_DECEL_END) {
    // Deceleration — ease-out
    const t = (p - P_FAST_END) / (P_DECEL_END - P_FAST_END);
    return lerp(fastVal, fastVal + 8, easeOut(t));
  }
  // Hold + fade
  return fastVal + 8;
}

function getOpacity(p: number, base: number): number {
  if (p < P_HOLD_END) return base;
  if (p < P_FADE_END) return base * (1 - (p - P_HOLD_END) / (P_FADE_END - P_HOLD_END));
  return 0;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HulyClock() {
  const hourRef   = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    let startTime = 0;

    function tick(ts: number) {
      if (!startTime) startTime = ts;
      const p = ((ts - startTime) % CYCLE_MS) / CYCLE_MS;

      const hourRot = getAngle(p, HOR_SLOW, HOR_FAST);
      const minRot  = getAngle(p, MIN_SLOW, MIN_FAST);
      const secRot  = getAngle(p, SEC_SLOW, SEC_FAST);

      if (hourRef.current) {
        hourRef.current.style.transform = `rotate(${hourRot}deg)`;
        hourRef.current.style.opacity   = String(getOpacity(p, 1));
      }
      if (minuteRef.current) {
        minuteRef.current.style.transform = `rotate(${minRot}deg)`;
        minuteRef.current.style.opacity   = String(getOpacity(p, 1));
      }
      if (secondRef.current) {
        secondRef.current.style.transform = `rotate(${secRot}deg)`;
        secondRef.current.style.opacity   = String(getOpacity(p, 0.65));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="huly-clock-dial scale-[1.1] md:mr-8 select-none">

      {/* Watch Crown */}
      <div className="absolute right-[-7px] top-[calc(50%-10px)] w-[8px] h-[20px] bg-zinc-700 rounded-[2px] border border-zinc-950 shadow-md" />

      {/* Dial texture grid */}
      <div className="absolute inset-[15px] rounded-full opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.85)_1px,transparent_0)] bg-[size:10px_10px] pointer-events-none" />

      {/* Brand watermark */}
      <div className="absolute w-[60px] h-[60px] opacity-[0.12] flex items-center justify-center pointer-events-none">
        <div className="w-[32px] h-[32px] border-[6px] border-white rounded-[6px] rotate-45" />
      </div>

      {/* Hour markers */}
      <span className="absolute top-[18px] text-[8px] text-zinc-500 font-extrabold tracking-wider">12</span>
      <span className="absolute right-[44px] top-[26px] text-[8px] text-zinc-600 font-extrabold">1</span>
      <span className="absolute right-[24px] top-[48px] text-[8px] text-zinc-600 font-extrabold">2</span>
      <span className="absolute right-[18px] top-[calc(50%-5px)] text-[8px] text-zinc-600 font-extrabold">3</span>
      <span className="absolute right-[24px] bottom-[48px] text-[8px] text-zinc-600 font-extrabold">4</span>
      <span className="absolute left-[24px] bottom-[48px] text-[8px] text-zinc-600 font-extrabold">8</span>
      <span className="absolute left-[18px] top-[calc(50%-5px)] text-[8px] text-zinc-600 font-extrabold">9</span>
      <span className="absolute left-[24px] top-[48px] text-[8px] text-zinc-600 font-extrabold">10</span>

      {/* Glowing accent arc */}
      <div className="huly-clock-glow-arc" />

      {/* Center pin (above hands) */}
      <div className="huly-clock-center-pin" />

      {/* Hands — driven by requestAnimationFrame above, NO CSS animation */}
      <div
        ref={hourRef}
        className="huly-clock-hand huly-clock-hand-hour"
        style={{ transform: 'rotate(0deg)', opacity: 1 }}
      />
      <div
        ref={minuteRef}
        className="huly-clock-hand huly-clock-hand-minute"
        style={{ transform: 'rotate(0deg)', opacity: 1 }}
      />
      <div
        ref={secondRef}
        className="huly-clock-hand huly-clock-hand-second"
        style={{ transform: 'rotate(0deg)', opacity: 0.65 }}
      />
    </div>
  );
}
