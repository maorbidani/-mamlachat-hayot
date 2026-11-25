import { AnimalId } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playAnimalSound(animalId: AnimalId): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  switch (animalId) {
    case 'parrot': {
      // Cheerful tropical Eclectus whistle + chirp
      const notes = [
        { start: 0, f1: 1450, f2: 2350, dur: 0.16 },
        { start: 0.21, f1: 1750, f2: 2700, dur: 0.18 },
        { start: 0.45, f1: 2100, f2: 1550, dur: 0.24 },
      ];
      notes.forEach(({ start, f1, f2, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f1, now + start);
        osc.frequency.exponentialRampToValueAtTime(f2, now + start + dur * 0.7);
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(0.24, now + start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      });
      break;
    }

    case 'cockatiel': {
      // Melodic cockatiel wolf-whistle & cheerful tweet
      const notes = [
        { start: 0, f1: 1850, f2: 2450, dur: 0.14 },
        { start: 0.18, f1: 2150, f2: 2850, dur: 0.22 },
        { start: 0.46, f1: 2700, f2: 1950, dur: 0.14 },
        { start: 0.64, f1: 2050, f2: 2950, dur: 0.26 },
      ];
      notes.forEach(({ start, f1, f2, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f1, now + start);
        osc.frequency.exponentialRampToValueAtTime(f2, now + start + dur * 0.75);
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      });
      break;
    }

    case 'guinea_pig': {
      // Classic guinea pig "wheek! wheek! wheek!"
      [0, 0.23, 0.46].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(920, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1920, now + offset + 0.12);
        osc.frequency.exponentialRampToValueAtTime(1400, now + offset + 0.18);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
      break;
    }

    case 'hamster': {
      // Tiny quick hamster squeaks + wood-shavings nibble
      [0, 0.14, 0.29].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now + offset);
        osc.frequency.exponentialRampToValueAtTime(3250, now + offset + 0.05);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
      [0.45, 0.56, 0.67].forEach((offset) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.05);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3600, now + offset);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.14, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + offset);
        noise.stop(now + offset + 0.05);
      });
      break;
    }

    case 'snake': {
      // Realistic gentle "ssssss" hiss using bandpass filtered noise
      const dur = 1.05;
      const source = ctx.createBufferSource();
      source.buffer = createNoiseBuffer(ctx, dur);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(5200, now);
      filter.Q.setValueAtTime(3.2, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.12);
      gain.gain.setValueAtTime(0.24, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + dur);
      break;
    }

    case 'python': {
      // Deeper slow python exhalation "shhh-ssss" + low slither
      const dur = 1.25;
      const source = ctx.createBufferSource();
      source.buffer = createNoiseBuffer(ctx, dur);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);
      filter.frequency.linearRampToValueAtTime(4300, now + 0.5);
      filter.Q.setValueAtTime(2.6, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.26, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + dur);
      break;
    }

    case 'tortoise': {
      // Crisp leafy crunch bursts + slow warm step thump
      [0, 0.28, 0.56].forEach((offset) => {
        const crunch = ctx.createBufferSource();
        crunch.buffer = createNoiseBuffer(ctx, 0.14);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1850, now + offset);
        filter.Q.setValueAtTime(2.0, now + offset);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.32, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
        crunch.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        crunch.start(now + offset);
        crunch.stop(now + offset + 0.14);
      });
      break;
    }

    case 'rabbit':
    case 'lop_rabbits': {
      // Soft playful bunny thump-thump + gentle sniffle
      const hops = animalId === 'lop_rabbits' ? [0, 0.14, 0.3] : [0, 0.17];
      hops.forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 150 : 125, now + offset);
        osc.frequency.exponentialRampToValueAtTime(48, now + offset + 0.11);
        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
      [0.42, 0.54, 0.66].forEach((offset) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.07);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2600, now + offset);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.065);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + offset);
        noise.stop(now + offset + 0.07);
      });
      break;
    }

    case 'bearded_dragon':
    case 'iguana': {
      // Leafy rustle + gentle lizard branch steps
      [0, 0.1, 0.21, 0.34, 0.48].forEach((offset, i) => {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.07);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime((animalId === 'iguana' ? 2200 : 2800) + i * 200, now + offset);
        filter.Q.setValueAtTime(3.6, now + offset);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + offset);
        noise.stop(now + offset + 0.07);
      });
      break;
    }

    case 'tarantula': {
      // Soft fuzzy velvet tip-toe taps + gentle stridulation
      [0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.49].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260 + (i % 2) * 50, now + offset);
        osc.frequency.exponentialRampToValueAtTime(110, now + offset + 0.035);
        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.045);
      });
      break;
    }

    case 'hissing_cockroach': {
      // Distinct Madagascar Hissing Cockroach pulsed air "ksss-ksss-ksss!"
      [0, 0.34, 0.68].forEach((offset) => {
        const dur = 0.24;
        const source = ctx.createBufferSource();
        source.buffer = createNoiseBuffer(ctx, dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(6200, now + offset);
        filter.Q.setValueAtTime(4.2, now + offset);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(now + offset);
        source.stop(now + offset + dur);
      });
      break;
    }
  }
}

export function playTimerChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const start = now + idx * 0.11;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.58);
  });
}

export function playWheelTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(640, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.03);
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

export function playWheelWin(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const start = now + i * 0.08;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.38);
  });
}

function playMacawSquawkPulse(ctx: AudioContext, startOffset: number, dur = 0.24): void {
  const t = ctx.currentTime + startOffset;

  // Dual harmonic reed-like oscillators for authentic nasal macaw "KRAAAK!"
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(1120, t);
  osc1.frequency.exponentialRampToValueAtTime(640, t + dur);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(1680, t);
  osc2.frequency.exponentialRampToValueAtTime(980, t + dur);

  // Rapid syrinx flutter modulation (~42Hz squawk rasp)
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(42, t);
  lfoGain.gain.setValueAtTime(95, t);
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1750, t);
  filter.Q.setValueAtTime(3.6, t);

  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
  gain.gain.setValueAtTime(0.2, t + dur * 0.65);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  lfo.start(t);
  osc1.start(t);
  osc2.start(t);

  lfo.stop(t + dur + 0.02);
  osc1.stop(t + dur + 0.02);
  osc2.stop(t + dur + 0.02);
}

let speechRepeatTimer: number | null = null;

export function stopMacawParrotGreeting(): void {
  if (speechRepeatTimer) {
    window.clearTimeout(speechRepeatTimer);
    speechRepeatTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function playMacawParrotGreeting(brandName = 'ממלכת החיות של גאולה'): boolean {
  stopMacawParrotGreeting();

  let audioActive = false;
  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    audioActive = ctx.state === 'running';
    try {
      // Double macaw squawk before speaking ("KRAAK! KRAAK!")
      playMacawSquawkPulse(ctx, 0.02, 0.22);
      playMacawSquawkPulse(ctx, 0.28, 0.18);
      // Celebratory chirp after speech
      playMacawSquawkPulse(ctx, 2.35, 0.16);
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const speakText = () => {
        const utterance = new SpeechSynthesisUtterance(`${brandName}!`);
        utterance.lang = 'he-IL';
        // High cheeky parrot pitch & crisp playful cadence
        utterance.pitch = 1.8;
        utterance.rate = 1.06;
        utterance.volume = 1;

        const voices = synth.getVoices();
        const hebrewVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('he')) ||
          voices.find((v) => v.lang.toLowerCase().includes('iw'));
        if (hebrewVoice) {
          utterance.voice = hebrewVoice;
        }
        synth.speak(utterance);
      };

      speechRepeatTimer = window.setTimeout(speakText, 460);
      audioActive = true;
    } catch {
      // ignore
    }
  }

  return audioActive;
}

