import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Volume2, X } from 'lucide-react';
import { ANIMALS } from '../data/animals';
import { AnimalId, BrandConfig } from '../types';
import {
  playAnimalSound,
  playMacawParrotGreeting,
  stopMacawParrotGreeting,
} from '../utils/audio';

interface EntranceIntroProps {
  brand: BrandConfig;
  onFinish: () => void;
}

interface StageAnimal {
  id: AnimalId;
  name: string;
  emoji: string;
  image: string;
  enterDelayMs: number;
  orbitPhase: number;
  orbitRing: number;
  scatterFactorX: number;
  scatterFactorY: number;
  archXFactor: number;
  archYFactor: number;
  borderHex: string;
}

const BORDER_COLORS = ['#F4B41A', '#1F5E3B', '#D97706', '#2E7D52', '#6B4423'];

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

const easeOutBack = (t: number) => {
  const c1 = 1.65;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const EntranceIntro: React.FC<EntranceIntroProps> = ({ brand, onFinish }) => {
  const [elapsed, setElapsed] = useState(0);
  const [soundHintVisible, setSoundHintVisible] = useState(false);
  const [macawSpeaking, setMacawSpeaking] = useState(false);
  const [stayOpen, setStayOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [tappedAnimalId, setTappedAnimalId] = useState<AnimalId | null>(null);
  const [stageSize, setStageSize] = useState({ width: 760, height: 480 });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const animStartRef = useRef<number>(performance.now());
  const parrotCalledRef = useRef<boolean>(false);
  const finishedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const speakResetTimerRef = useRef<number | null>(null);
  const tapHighlightTimerRef = useRef<number | null>(null);

  // Relaxed, theatrical 20.5-second choreography
  const SCATTER_END_MS = 2800;
  const CIRCLE_END_MS = 8200;
  const ARCH_SETTLE_END_MS = 11400;
  const PARROT_ENTER_MS = 13200; // Wait clearly after the name forms so the title shines first
  const PARROT_SPEAK_MS = 14400;
  const TOTAL_SHOW_MS = 20500;

  useEffect(() => {
    setLogoError(false);
  }, [brand.logoImage]);

  // Measure bounded stage dimensions so zero items ever clip on mobile (375px) or desktop (1440px)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Build normalized coordinates (-1..1 inside safe stage bounds) for all 13 animals
  const stageAnimals = useMemo<StageAnimal[]>(() => {
    const total = ANIMALS.length;
    return ANIMALS.map((animal, idx) => {
      const goldenAngle = idx * 2.39996;
      const radial = 0.45 + ((idx * 19) % 45) / 100;
      const scatterFactorX = Math.cos(goldenAngle) * radial;
      const scatterFactorY = Math.sin(goldenAngle) * radial * 0.85;

      // Final balanced framing arch around the center crest:
      // 7 across the upper botanical crown, 6 across the lower meadow floor
      let archXFactor = 0;
      let archYFactor = 0;
      if (idx < 7) {
        const ratio = idx / 6; // 0..1
        archXFactor = 0.82 - ratio * 1.64; // Right to Left (RTL flow)
        archYFactor = -0.62 - Math.sin(ratio * Math.PI) * 0.2;
      } else {
        const ratio = (idx - 7) / Math.max(1, total - 8);
        archXFactor = 0.72 - ratio * 1.44;
        archYFactor = 0.64 + Math.sin(ratio * Math.PI) * 0.16;
      }

      return {
        id: animal.id,
        name: animal.name,
        emoji: animal.emoji,
        image: brand.customAnimalImages[animal.id] || animal.defaultImage,
        enterDelayMs: idx * 145,
        orbitPhase: (idx / total) * Math.PI * 2,
        orbitRing: idx % 2 === 0 ? 1 : 0.78,
        scatterFactorX,
        scatterFactorY,
        archXFactor,
        archYFactor,
        borderHex: BORDER_COLORS[idx % BORDER_COLORS.length],
      };
    });
  }, [brand.customAnimalImages]);

  const handleClose = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (speakResetTimerRef.current) window.clearTimeout(speakResetTimerRef.current);
    if (tapHighlightTimerRef.current) window.clearTimeout(tapHighlightTimerRef.current);
    stopMacawParrotGreeting();
    onFinish();
  };

  const triggerParrotVoice = (fromUserTap = false) => {
    setMacawSpeaking(true);
    const ok = playMacawParrotGreeting(brand.businessName);
    if (!ok && !fromUserTap) {
      setSoundHintVisible(true);
    } else if (fromUserTap) {
      setSoundHintVisible(false);
    }
    if (speakResetTimerRef.current) window.clearTimeout(speakResetTimerRef.current);
    speakResetTimerRef.current = window.setTimeout(() => {
      setMacawSpeaking(false);
    }, 3400);
  };

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setElapsed(PARROT_ENTER_MS + 1400);
      setStayOpen(true);
      return;
    }

    animStartRef.current = performance.now();

    const step = (now: number) => {
      const ms = now - animStartRef.current;
      setElapsed(ms);

      if (ms >= PARROT_SPEAK_MS && !parrotCalledRef.current) {
        parrotCalledRef.current = true;
        triggerParrotVoice(false);
      }

      if (ms < TOTAL_SHOW_MS + 800) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (speakResetTimerRef.current) window.clearTimeout(speakResetTimerRef.current);
      if (tapHighlightTimerRef.current) window.clearTimeout(tapHighlightTimerRef.current);
      stopMacawParrotGreeting();
    };
  }, []);

  useEffect(() => {
    if (stayOpen) return;
    if (elapsed >= TOTAL_SHOW_MS) {
      handleClose();
    }
  }, [elapsed, stayOpen]);

  const handleReplay = () => {
    setStayOpen(true);
    parrotCalledRef.current = false;
    stopMacawParrotGreeting();
    animStartRef.current = performance.now();
    setElapsed(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const ms = now - animStartRef.current;
      setElapsed(ms);
      if (ms >= PARROT_SPEAK_MS && !parrotCalledRef.current) {
        parrotCalledRef.current = true;
        triggerParrotVoice(true);
      }
      if (ms < TOTAL_SHOW_MS + 800) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const handleTapAnimal = (e: React.MouseEvent, animalId: AnimalId) => {
    e.stopPropagation();
    playAnimalSound(animalId);
    setTappedAnimalId(animalId);
    if (tapHighlightTimerRef.current) window.clearTimeout(tapHighlightTimerRef.current);
    tapHighlightTimerRef.current = window.setTimeout(() => {
      setTappedAnimalId(null);
    }, 1100);
  };

  // Safe pixel radii derived from measured stage box (with generous padding for 56px medallions)
  const isCompact = stageSize.width < 520;
  const maxHalfW = Math.max(115, stageSize.width / 2 - (isCompact ? 34 : 52));
  const maxHalfH = Math.max(130, stageSize.height / 2 - (isCompact ? 36 : 48));

  // Choreography curves
  const circleMix = easeInOutCubic(clamp((elapsed - (SCATTER_END_MS - 350)) / 1350));
  const archMix = easeInOutCubic(clamp((elapsed - CIRCLE_END_MS) / (ARCH_SETTLE_END_MS - CIRCLE_END_MS)));
  const crestReveal = easeOutBack(clamp((elapsed - (CIRCLE_END_MS + 250)) / 950));
  const crestOpacity = clamp((elapsed - (CIRCLE_END_MS + 100)) / 700);

  // Macaw flight path: enters from top-right sky, glides in a joyful loop, then perches atop crest
  const macawVisible = elapsed >= PARROT_ENTER_MS;
  const macawSince = Math.max(0, elapsed - PARROT_ENTER_MS);
  const flyProgress = easeInOutCubic(clamp(macawSince / 1700));
  const hoverTime = Math.max(0, macawSince - 1700);

  const startX = maxHalfW * 0.92;
  const startY = -maxHalfH * 0.95;
  const perchX = isCompact ? maxHalfW * 0.48 : maxHalfW * 0.42;
  const perchY = isCompact ? -maxHalfH * 0.42 : -maxHalfH * 0.38;

  const swoopArcX = Math.sin(flyProgress * Math.PI) * (-maxHalfW * 0.85);
  const swoopArcY = Math.sin(flyProgress * Math.PI * 1.4) * (maxHalfH * 0.36);

  const macawX =
    startX * (1 - flyProgress) +
    perchX * flyProgress +
    swoopArcX * (1 - Math.pow(flyProgress, 2)) +
    Math.sin(hoverTime * 0.0024) * 8 * flyProgress;

  const macawY =
    startY * (1 - flyProgress) +
    perchY * flyProgress +
    swoopArcY * (1 - flyProgress) +
    Math.cos(hoverTime * 0.0032) * 5 * flyProgress;

  const macawFacingLeft = flyProgress < 0.65 ? true : Math.sin(hoverTime * 0.0014) >= -0.35;
  const macawWingFlap =
    flyProgress < 0.96
      ? Math.sin((elapsed / 1000) * 16) * 24
      : Math.sin((elapsed / 1000) * 5) * 7;
  const macawBeakOpen =
    macawSpeaking || (elapsed >= PARROT_SPEAK_MS && elapsed <= PARROT_SPEAK_MS + 3200)
      ? Math.abs(Math.sin((elapsed / 1000) * 13)) * 13
      : 0;

  const words = [
    { text: 'ממלכת', line: 1, start: CIRCLE_END_MS + 500 },
    { text: 'החיות', line: 1, start: CIRCLE_END_MS + 1100 },
    { text: 'של', line: 2, start: CIRCLE_END_MS + 1700 },
    { text: 'גאולה', line: 2, start: CIRCLE_END_MS + 2250 },
  ];

  const progressPct = Math.min(100, (elapsed / TOTAL_SHOW_MS) * 100);

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="פתיח ממלכת החיות של גאולה"
      onClick={() => {
        if (soundHintVisible && macawVisible) triggerParrotVoice(true);
      }}
      className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#FAF4E4] via-[#F2E4C2] to-[#DCE8D5] dark:from-[#0C1710] dark:via-[#122218] dark:to-[#192D20] flex flex-col justify-between select-none"
    >
      {/* Subtle Top Timeline Progress */}
      <div className="w-full h-1 bg-[#6B4423]/10 dark:bg-white/10 shrink-0">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full bg-[#F4B41A] transition-[width] duration-100 ease-linear"
        />
      </div>

      {/* Sunbeam Rays + Botanical Meadow Landscape */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Warm Rotating Sunburst Glow */}
        <div
          style={{
            opacity: 0.45 + crestOpacity * 0.35,
            transform: `translate(-50%, -50%) rotate(${(elapsed / 1000) * 4}deg) scale(${0.92 + crestOpacity * 0.16})`,
          }}
          className="absolute left-1/2 top-[46%] w-[780px] h-[780px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(244,180,26,0.14)_18deg,transparent_36deg,transparent_72deg,rgba(244,180,26,0.12)_90deg,transparent_108deg,transparent_144deg,rgba(244,180,26,0.14)_162deg,transparent_180deg,transparent_216deg,rgba(244,180,26,0.12)_234deg,transparent_252deg,transparent_288deg,rgba(244,180,26,0.14)_306deg,transparent_324deg)] blur-md"
        />

        {/* Layered Rolling Botanical Meadow Hills */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full h-36 sm:h-48 opacity-85 dark:opacity-50"
        >
          <path
            d="M0,224 C240,140 480,260 760,188 C1040,116 1240,210 1440,164 L1440,320 L0,320 Z"
            fill="#86B48F"
            fillOpacity="0.35"
          />
          <path
            d="M0,250 C320,190 600,290 920,220 C1160,168 1320,235 1440,215 L1440,320 L0,320 Z"
            fill="#1F5E3B"
            fillOpacity="0.22"
          />
        </svg>

        {/* Botanical Corner Leaves */}
        <svg
          viewBox="0 0 180 180"
          className="absolute -top-4 -right-4 w-36 h-36 sm:w-48 sm:h-48 text-[#1F5E3B]/15 dark:text-[#7CD49E]/15"
          style={{ transform: `rotate(${Math.sin(elapsed / 1400) * 3}deg)` }}
        >
          <path
            d="M170,10 C120,22 75,65 55,130 C95,105 135,72 170,10 Z"
            fill="currentColor"
          />
          <path
            d="M150,0 C95,12 45,45 15,92 C60,72 110,48 150,0 Z"
            fill="currentColor"
          />
        </svg>
        <svg
          viewBox="0 0 180 180"
          className="absolute -top-4 -left-4 w-36 h-36 sm:w-48 sm:h-48 text-[#1F5E3B]/15 dark:text-[#7CD49E]/15"
          style={{ transform: `scaleX(-1) rotate(${Math.cos(elapsed / 1400) * 3}deg)` }}
        >
          <path
            d="M170,10 C120,22 75,65 55,130 C95,105 135,72 170,10 Z"
            fill="currentColor"
          />
          <path
            d="M150,0 C95,12 45,45 15,92 C60,72 110,48 150,0 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Top Controls */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-4 pt-3 sm:px-6 sm:pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStayOpen(true);
            triggerParrotVoice(true);
          }}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-[#1B2820]/90 border border-[#6B4423]/15 dark:border-[#E6EDE8]/15 text-[#1F5E3B] dark:text-[#7CD49E] text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm active:scale-95 transition-transform cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-[#F4B41A] shrink-0" />
          <span>{soundHintVisible ? 'לחצי לשמוע את התוכי' : 'שמע קול תוכי'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#1C2A21]/10 dark:bg-white/10 hover:bg-[#1C2A21]/20 text-[#1C2A21] dark:text-[#E6EDE8] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
        >
          <span>דלג</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bounded Theater Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 w-full max-w-4xl mx-auto my-2 overflow-visible flex items-center justify-center"
      >
        {/* Subtle Winding Golden Garden Ring behind creatures */}
        <div
          style={{
            opacity: 0.16 + circleMix * 0.25,
            transform: `scale(${0.88 + archMix * 0.12}) rotate(${(elapsed / 1000) * 6}deg)`,
          }}
          className="absolute w-[68%] h-[68%] max-w-[540px] max-h-[340px] rounded-full border-2 border-dashed border-[#6B4423]/30 dark:border-[#F4B41A]/30 pointer-events-none"
        />

        {/* All 13 Real Animals Dancing -> Circling -> Framing the Storybook Crest */}
        {stageAnimals.map((a, idx) => {
          const pop = clamp((elapsed - a.enterDelayMs) / 550);
          const popScale = easeOutBack(pop);

          const scatterX = a.scatterFactorX * maxHalfW;
          const scatterY = a.scatterFactorY * maxHalfH + Math.sin(elapsed / 460 + idx) * 6;

          const activeCircleMs = Math.max(0, elapsed - (SCATTER_END_MS - 450));
          const angle = a.orbitPhase + activeCircleMs * 0.00095;
          const hop = Math.abs(Math.sin(elapsed * 0.0052 + idx)) * 8 * (1 - archMix);

          const circleX = Math.cos(angle) * (maxHalfW * 0.84 * a.orbitRing);
          const circleY = Math.sin(angle) * (maxHalfH * 0.72 * a.orbitRing) - hop;

          const archX = a.archXFactor * maxHalfW;
          const archY =
            a.archYFactor * maxHalfH +
            (archMix > 0.85 ? Math.sin(elapsed * 0.003 + idx * 0.7) * 4 : 0);

          const midX = scatterX * (1 - circleMix) + circleX * circleMix;
          const midY = scatterY * (1 - circleMix) + circleY * circleMix;

          const finalX = midX * (1 - archMix) + archX * archMix;
          const finalY = midY * (1 - archMix) + archY * archMix;

          const isTapped = tappedAnimalId === a.id;
          const scale = popScale * (isTapped ? 1.24 : 1 - archMix * 0.08);

          return (
            <button
              key={a.id}
              type="button"
              onClick={(e) => handleTapAnimal(e, a.id)}
              title={`${a.name} — לחצי לשמוע`}
              aria-label={`השמע קול ${a.name}`}
              style={{
                opacity: pop,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px)) scale(${Math.max(0.01, scale)})`,
              }}
              className="absolute z-10 will-change-transform cursor-pointer focus:outline-none group"
            >
              <div
                style={{ borderColor: a.borderHex }}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 bg-[#FFFDF7] dark:bg-[#1B2820] shadow-md overflow-hidden flex items-center justify-center transition-shadow group-hover:shadow-lg"
              >
                <img
                  src={a.image}
                  alt={a.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {isTapped && (
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#1F5E3B] text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow">
                  {a.name}
                </span>
              )}
            </button>
          );
        })}

        {/* Central Storybook Brand Crest (Revealed Calmly Inside the Framing Arch) */}
        <div
          style={{
            opacity: crestOpacity,
            transform: `scale(${0.86 + crestReveal * 0.14})`,
          }}
          className="relative z-20 text-center max-w-[290px] sm:max-w-lg px-4 pointer-events-none"
        >
          <div className="bg-[#FFFDF7]/95 dark:bg-[#192820]/95 backdrop-blur-sm rounded-[2rem] px-6 py-5 sm:px-10 sm:py-7 shadow-xl border-2 border-[#F4B41A]">
            {/* Brand Emblem Medallion */}
            <div className="mx-auto -mt-10 sm:-mt-12 mb-2.5 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FFFDF7] dark:bg-[#223229] border-2 border-[#F4B41A] shadow-md overflow-hidden flex items-center justify-center">
              {logoError || !brand.logoImage ? (
                <span className="text-2xl sm:text-3xl" aria-hidden="true">
                  🐾
                </span>
              ) : (
                <img
                  src={brand.logoImage}
                  alt={brand.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black leading-tight text-[#1F5E3B] dark:text-[#7CD49E] flex flex-wrap justify-center gap-x-2.5">
              {words
                .filter((w) => w.line === 1)
                .map((w) => {
                  const p = easeOutBack(clamp((elapsed - w.start) / 650));
                  return (
                    <span
                      key={w.text}
                      style={{
                        opacity: clamp((elapsed - w.start) / 400),
                        transform: `translateY(${(1 - p) * 12}px) scale(${0.85 + p * 0.15})`,
                      }}
                      className="inline-block"
                    >
                      {w.text}
                    </span>
                  );
                })}
            </h1>

            <p className="text-3xl sm:text-5xl font-black leading-tight text-[#6B4423] dark:text-[#F4B41A] flex flex-wrap justify-center gap-x-2.5 mt-0.5">
              {words
                .filter((w) => w.line === 2)
                .map((w) => {
                  const p = easeOutBack(clamp((elapsed - w.start) / 650));
                  return (
                    <span
                      key={w.text}
                      style={{
                        opacity: clamp((elapsed - w.start) / 400),
                        transform: `translateY(${(1 - p) * 12}px) scale(${0.85 + p * 0.15})`,
                      }}
                      className="inline-block"
                    >
                      {w.text}
                    </span>
                  );
                })}
            </p>

            <p
              style={{
                opacity: clamp((elapsed - (CIRCLE_END_MS + 2750)) / 650),
              }}
              className="text-[11px] sm:text-xs font-bold text-[#4A554E] dark:text-[#B5C4BA] mt-2.5"
            >
              גנים · חוגים · ימי הולדת · קייטנות
            </p>
          </div>
        </div>

        {/* Scarlet Ara Macaw Swooping In After Name Appears */}
        {macawVisible && (
          <div
            style={{
              opacity: clamp(macawSince / 380),
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${macawX}px), calc(-50% + ${macawY}px))`,
            }}
            className="absolute z-30 pointer-events-none will-change-transform flex flex-col items-center"
          >
            {flyProgress > 0.6 && (
              <div
                style={{ opacity: clamp((flyProgress - 0.6) / 0.4) }}
                className="mb-1 bg-[#FFF9E8] dark:bg-[#223229] border-2 border-[#F4B41A] rounded-2xl px-3.5 py-1.5 shadow-lg whitespace-nowrap text-center"
              >
                <p className="text-xs sm:text-sm font-black text-[#1F5E3B] dark:text-[#F4B41A]">
                  קְרָאאק! {brand.businessName}!
                </p>
              </div>
            )}

            <div
              style={{
                transform: `scaleX(${macawFacingLeft ? -1 : 1}) rotate(${flyProgress < 0.9 ? -8 : -2}deg)`,
              }}
              className="w-20 h-20 sm:w-28 sm:h-28 drop-shadow-xl"
            >
              <svg viewBox="0 0 180 150" className="w-full h-full overflow-visible">
                {/* Tricolor Tail Feathers */}
                <path d="M48 92 L8 134 L22 104 Z" fill="#0284C7" />
                <path d="M52 94 L16 140 L34 102 Z" fill="#DC2626" />
                <path d="M56 96 L28 138 L44 98 Z" fill="#F4B41A" />

                {/* Back Wing */}
                <g transform={`rotate(${-macawWingFlap * 0.85} 85 68)`}>
                  <path d="M78 65 C62 20, 26 14, 22 45 C36 58, 58 68, 78 72 Z" fill="#E11D48" />
                  <path d="M66 56 C52 32, 34 28, 28 45 C42 52, 56 58, 66 62 Z" fill="#F4B41A" />
                </g>

                {/* Torso */}
                <ellipse cx="90" cy="78" rx="30" ry="21" transform="rotate(-22 90 78)" fill="#DC2626" />
                <ellipse cx="95" cy="84" rx="22" ry="13" transform="rotate(-20 95 84)" fill="#EF4444" />

                {/* Front Wing */}
                <g transform={`rotate(${macawWingFlap} 88 72)`}>
                  <path d="M84 68 C70 16, 18 10, 14 48 C30 68, 60 76, 86 78 Z" fill="#DC2626" />
                  <path d="M72 64 C56 30, 28 28, 22 48 C36 58, 56 66, 74 68 Z" fill="#F4B41A" />
                  <path d="M54 58 C42 42, 26 42, 20 52 C32 60, 46 64, 62 66 Z" fill="#0284C7" />
                </g>

                {/* Head & Facial Patch */}
                <circle cx="116" cy="54" r="18" fill="#DC2626" />
                <ellipse cx="121" cy="54" rx="10" ry="8" fill="#FFFDF7" />
                <circle cx="122" cy="52" r="3" fill="#1C2A21" />
                <circle cx="123" cy="51" r="1" fill="#FFFFFF" />

                {/* Upper & Moving Lower Beak */}
                <path d="M128 47 C146 46, 152 58, 146 67 C142 63, 136 60, 128 59 Z" fill="#FDE68A" />
                <g transform={`rotate(${macawBeakOpen} 128 58)`}>
                  <path d="M128 58 L142 61 C140 66, 134 68, 127 64 Z" fill="#1C2A21" />
                </g>

                {/* Feet */}
                <path d="M84 96 L78 106 M92 94 L87 104" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-30 pb-6 pt-2 px-4 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="min-h-[48px] px-7 py-2.5 rounded-2xl bg-[#1F5E3B] hover:bg-[#16462B] text-white font-extrabold text-sm sm:text-base shadow-lg border-2 border-[#F4B41A] active:scale-95 transition-all cursor-pointer"
        >
          כניסה לאפליקציה
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStayOpen((prev) => !prev);
          }}
          className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm border inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
            stayOpen
              ? 'bg-[#F4B41A] text-[#1C2A21] border-[#F4B41A]'
              : 'bg-white/90 dark:bg-[#1B2820]/90 text-[#6B4423] dark:text-[#E6EDE8] border-[#6B4423]/20'
          }`}
        >
          {stayOpen ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span>{stayOpen ? 'מושהה לצפייה' : 'עצור כאן לצפייה'}</span>
        </button>

        {elapsed >= 3500 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReplay();
            }}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-[#1B2820]/90 hover:bg-[#F3EDE0] text-[#6B4423] dark:text-[#F4B41A] font-bold text-xs sm:text-sm border border-[#6B4423]/20 active:scale-95 transition-all cursor-pointer"
          >
            צפה שוב
          </button>
        )}
      </div>
    </div>
  );
};
