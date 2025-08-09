\
    'use client';

    import React, { useEffect, useRef, useState } from "react";

    // Props exposed to Plasmic
    type Props = {
      panelHue?: string;
      woodPreset?: 'walnut'|'rosewood'|'oak'|'ebony';
      iconSize?: number;
      padSize?: 'sm'|'md'|'lg';
      showMeasureLines?: boolean;
    };

    // --- DR-16 core ---
    const STEPS = 16;
    const NUM_BANKS = 4;
    const INSTRUMENTS = [
      { id: "kick", name: "KICK", key: "A" },
      { id: "snare", name: "SNARE", key: "S" },
      { id: "hat", name: "CH HAT", key: "D" },
      { id: "openHat", name: "OH HAT", key: "F" },
      { id: "rim", name: "RIM", key: "G" },
      { id: "tomLow", name: "TOM L", key: "H" },
      { id: "tomMid", name: "TOM M", key: "J" },
      { id: "tomHigh", name: "TOM H", key: "K" },
      { id: "ride", name: "RIDE", key: "L" },
    ];

    const KEY_TO_INST: Record<string, string> = {
      KeyA: "kick", KeyS: "snare", KeyD: "hat", KeyF: "openHat", KeyG: "rim",
      KeyH: "tomLow", KeyJ: "tomMid", KeyK: "tomHigh", KeyL: "ride",
    };

    const InstIcon = ({ id, size=12 }: { id: string; size?: number }) => {
      const common = "mr-2";
      const w = size, h = size;
      switch (id) {
        case 'kick':   return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><circle cx="10" cy="10" r="6" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'snare':  return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><rect x="4" y="6" width="12" height="8" rx="1.5" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /><line x1="4" y1="9" x2="16" y2="9" stroke="#0a0a0a" strokeWidth="0.8" /><line x1="4" y1="11" x2="16" y2="11" stroke="#0a0a0a" strokeWidth="0.8" /></svg>);
        case 'hat':    return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><path d="M4 10 L10 7 L16 10" fill="none" stroke="#d4c8a3" strokeWidth="1.5" /><line x1="4" y1="12.5" x2="16" y2="12.5" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'openHat':return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><path d="M4 9 L10 6 L16 9" fill="none" stroke="#d4c8a3" strokeWidth="1.5" /><path d="M5 13 L15 13" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="2 2" /></svg>);
        case 'rim':    return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><rect x="6" y="6" width="8" height="8" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'tomLow': return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><circle cx="10" cy="10" r="6.5" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'tomMid': return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><circle cx="10" cy="10" r="5.2" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'tomHigh':return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><circle cx="10" cy="10" r="4.2" fill="#d4c8a3" stroke="#0a0a0a" strokeWidth="1" /></svg>);
        case 'ride':   return (<svg viewBox="0 0 20 20" width={w} height={h} className={common} aria-hidden><path d="M3 11 C8 6, 12 6, 17 11" fill="none" stroke="#d4c8a3" strokeWidth="1.5" /><circle cx="10" cy="11" r="1" fill="#0a0a0a" /></svg>);
        default: return null;
      }
    };

    export default function DrumMachine({
      panelHue = '#2b2b2b',
      woodPreset = 'walnut',
      iconSize = 12,
      padSize = 'md',
      showMeasureLines = true
    }: Props) {
      const [bpm, setBpm] = useState(120);
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentStep, setCurrentStep] = useState(-1);
      const [master, setMaster] = useState(0.9);
      const [swing, setSwing] = useState(0);
      const [currentBank, setCurrentBank] = useState(0);
      const [accentPattern, setAccentPattern] = useState(Array(STEPS).fill(false));

      const [patternBanks, setPatternBanks] = useState(() => {
        const createBlankPattern = () => {
          const blank = Array(STEPS).fill(false);
          const init = {} as Record<string, boolean[]>;
          INSTRUMENTS.forEach((inst) => (init[inst.id] = [...blank]));
          return init;
        };
        return Array(NUM_BANKS).fill(null).map(() => createBlankPattern());
      });

      const pattern = patternBanks[currentBank];

      // Audio
      const audioCtxRef = useRef<AudioContext | null>(null);
      const masterGainRef = useRef<GainNode | null>(null);
      const ensureAudio = () => {
        if (!audioCtxRef.current) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const masterGain = ctx.createGain();
          masterGain.gain.value = master;
          masterGain.connect(ctx.destination);
          audioCtxRef.current = ctx;
          masterGainRef.current = masterGain;
        }
        return audioCtxRef.current!;
      };
      useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = master; }, [master]);

      // Sounds (unchanged core synthesis)
      const playKick = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        const baseVol = accent ? 1.3 : 1.0;
        o.frequency.setValueAtTime(accent ? 180 : 150, time);
        o.frequency.exponentialRampToValueAtTime(accent ? 45 : 40, time + 0.1);
        g.gain.setValueAtTime(baseVol, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        o.connect(g).connect(masterGainRef.current!);
        o.start(time);
        o.stop(time + 0.5);
      };
      const playSnare = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = accent ? 2000 : 1800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(accent ? 1.1 : 0.9, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        noise.connect(hp).connect(g).connect(masterGainRef.current!);
        noise.start(time);
        noise.stop(time + 0.2);
      };
      const playClosedHat = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = accent ? 9000 : 8000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(accent ? 0.45 : 0.35, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
        noise.connect(bp).connect(g).connect(masterGainRef.current!);
        noise.start(time);
        noise.stop(time + 0.08);
      };
      const playOpenHat = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = accent ? 9000 : 8000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(accent ? 0.45 : 0.35, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        noise.connect(bp).connect(g).connect(masterGainRef.current!);
        noise.start(time);
        noise.stop(time + 0.3);
      };
      const playRide = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bp1 = ctx.createBiquadFilter();
        bp1.type = "bandpass";
        bp1.frequency.value = accent ? 7500 : 7000;
        const bp2 = ctx.createBiquadFilter();
        bp2.type = "bandpass";
        bp2.frequency.value = accent ? 10500 : 10000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(accent ? 0.45 : 0.35, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.9);
        noise.connect(bp1).connect(bp2).connect(g).connect(masterGainRef.current!);
        noise.start(time);
        noise.stop(time + 0.9);
      };
      const playTom = (time: number, baseFreq: number, accent = false) => {
        const ctx = ensureAudio();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        const freq = baseFreq * (accent ? 1.1 : 1.08);
        o.frequency.setValueAtTime(freq, time);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, time + 0.16);
        g.gain.setValueAtTime(accent ? 0.95 : 0.8, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nBuf.length; i++) nData[i] = Math.random() * 2 - 1;
        const n = ctx.createBufferSource();
        n.buffer = nBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = accent ? 2800 : 2500;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(accent ? 0.35 : 0.25, time);
        ng.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        o.connect(g).connect(masterGainRef.current!);
        n.connect(bp).connect(ng).connect(masterGainRef.current!);
        o.start(time); n.start(time);
        o.stop(time + 0.4); n.stop(time + 0.06);
      };
      const playRimshot = (time: number, accent = false) => {
        const ctx = ensureAudio();
        const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.035, ctx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nBuf.length; i++) nData[i] = Math.random() * 2 - 1;
        const n = ctx.createBufferSource();
        n.buffer = nBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = accent ? 2500 : 2200;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = accent ? 3800 : 3400;
        bp.Q.value = 10;
        const g = ctx.createGain();
        g.gain.setValueAtTime(accent ? 0.9 : 0.75, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.setValueAtTime(accent ? 1350 : 1150, time);
        const og = ctx.createGain();
        og.gain.setValueAtTime(accent ? 0.12 : 0.09, time);
        og.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        n.connect(hp).connect(bp).connect(g).connect(masterGainRef.current!);
        o.connect(og).connect(masterGainRef.current!);
        n.start(time); o.start(time);
        n.stop(time + 0.06); o.stop(time + 0.06);
      };

      // Scheduler
      const schedulerRef = useRef<number | null>(null);
      const nextNoteTimeRef = useRef(0);
      const stepRef = useRef(0);
      const patternRef = useRef(pattern);
      const accentRef = useRef(accentPattern);
      const currentStepRef = useRef(currentStep);
      useEffect(() => { patternRef.current = pattern; }, [pattern]);
      useEffect(() => { accentRef.current = accentPattern; }, [accentPattern]);
      useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

      const noteInterval = () => 60 / bpm / 4;
      const scheduleAheadTime = 0.1;
      const lookahead = 25;

      const trigger = (id: string, when: number, accent = false) => {
        if (id === "kick") playKick(when, accent);
        if (id === "snare") playSnare(when, accent);
        if (id === "hat") playClosedHat(when, accent);
        if (id === "openHat") playOpenHat(when, accent);
        if (id === "rim") playRimshot(when, accent);
        if (id === "tomLow") playTom(when, 160, accent);
        if (id === "tomMid") playTom(when, 190, accent);
        if (id === "tomHigh") playTom(when, 230, accent);
        if (id === "ride") playRide(when, accent);
      };

      const schedule = () => {
        const ctx = ensureAudio();
        while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
          const step = stepRef.current;
          const livePattern = patternRef.current;
          const accents = accentRef.current;
          let swingOffset = 0;
          if (swing > 0 && step % 2 === 1) swingOffset = (swing / 100) * noteInterval() * 0.5;
          const playTime = nextNoteTimeRef.current + swingOffset;
          const isAccented = accents[step];
          INSTRUMENTS.forEach((inst) => { if (livePattern[inst.id][step]) trigger(inst.id, playTime, isAccented); });
          setCurrentStep(step);
          currentStepRef.current = step;
          nextNoteTimeRef.current += noteInterval();
          stepRef.current = (step + 1) % STEPS;
        }
      };

      const start = () => {
        if (isPlaying || schedulerRef.current) return;
        ensureAudio();
        const ctx = audioCtxRef.current!;
        if (ctx.state === "suspended") ctx.resume();
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
        stepRef.current = 0;
        setIsPlaying(true);
        schedulerRef.current = window.setInterval(schedule, lookahead);
      };
      const stop = () => {
        if (schedulerRef.current) { window.clearInterval(schedulerRef.current); schedulerRef.current = null; }
        setIsPlaying(false); setCurrentStep(-1);
      };
      useEffect(() => () => { if (schedulerRef.current) { window.clearInterval(schedulerRef.current); schedulerRef.current = null; } }, []);

      // Keyboard
      useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
          if (e.code === "Space") { e.preventDefault(); isPlaying ? stop() : start(); return; }
          if (e.code.startsWith("Digit") && !isPlaying) {
            const bank = parseInt(e.code.slice(-1)) - 1;
            if (bank >= 0 && bank < NUM_BANKS) { setCurrentBank(bank); return; }
          }
          const instId = KEY_TO_INST[e.code];
          if (!instId) return;
          setPatternBanks((prev) => {
            const step = currentStepRef.current;
            if (step < 0) return prev;
            const newBanks = [...prev];
            const currentPattern = newBanks[currentBank];
            const row = currentPattern[instId];
            const nextRow = row.map((v, i) => (i === step ? !v : v));
            newBanks[currentBank] = { ...currentPattern, [instId]: nextRow };
            return newBanks;
          });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [isPlaying, currentBank]);

      const clearRow = (instId: string) => {
        setPatternBanks((prev) => {
          const newBanks = [...prev];
          newBanks[currentBank] = { ...newBanks[currentBank], [instId]: Array(STEPS).fill(false) };
          return newBanks;
        });
      };
      const clearBank = () => {
        setPatternBanks((prev) => {
          const newBanks = [...prev];
          const blank = {} as Record<string, boolean[]>;
          INSTRUMENTS.forEach((inst) => (blank[inst.id] = Array(STEPS).fill(false)));
          newBanks[currentBank] = blank;
          return newBanks;
        });
        setAccentPattern(Array(STEPS).fill(false));
      };
      const scheduleHitAtStep = (instId: string, stepIndex: number) => {
        const ctx = ensureAudio();
        const now = ctx.currentTime;
        const cur = stepRef.current;
        const stepsAhead = stepIndex >= cur ? stepIndex - cur : STEPS - cur + stepIndex;
        const when = nextNoteTimeRef.current + stepsAhead * noteInterval();
        if (when > now) trigger(instId, when, accentPattern[stepIndex]);
      };
      const togglePad = (instId: string, step: number) => {
        setPatternBanks((prev) => {
          const newBanks = [...prev];
          const currentPattern = newBanks[currentBank];
          const nextRow = currentPattern[instId].map((v, i) => (i === step ? !v : v));
          const turnedOn = !currentPattern[instId][step] && nextRow[step];
          newBanks[currentBank] = { ...currentPattern, [instId]: nextRow };
          if (isPlaying && turnedOn) scheduleHitAtStep(instId, step);
          return newBanks;
        });
      };
      const toggleAccent = (step: number) => {
        setAccentPattern((prev) => prev.map((v, i) => (i === step ? !v : v)));
      };

      // Persistence
      useEffect(() => {
        try {
          const saved = localStorage.getItem("dr16_state_v1");
          if (saved) {
            const s = JSON.parse(saved);
            if (s.patternBanks) setPatternBanks(s.patternBanks);
            if (Array.isArray(s.accentPattern)) setAccentPattern(s.accentPattern);
            if (typeof s.bpm === "number") setBpm(s.bpm);
            if (typeof s.swing === "number") setSwing(s.swing);
            if (typeof s.master === "number") setMaster(s.master);
            if (typeof s.currentBank === "number") setCurrentBank(s.currentBank);
          }
        } catch {}
      }, []);
      useEffect(() => {
        try {
          localStorage.setItem("dr16_state_v1", JSON.stringify({ patternBanks, accentPattern, bpm, swing, master, currentBank }));
        } catch {}
      }, [patternBanks, accentPattern, bpm, swing, master, currentBank]);

      // Styles
      const labelClass = "text-[10px] tracking-[0.2em] font-mono text-[#e7d6a3]";
      const led = (on: boolean) => `w-3 h-3 rounded-full border border-black ${on ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9),inset_0_1px_2px_rgba(255,255,255,0.6)]' : 'bg-[#3a0d0d]'} `;
      const padHeight = padSize === 'lg' ? 'h-14' : padSize === 'sm' ? 'h-10' : 'h-12';
      const wood = {
        walnut: 'repeating-linear-gradient(90deg,#6b4a2f 0px,#704c30 12px,#5f3f27 22px,#6e4a31 36px)',
        rosewood: 'repeating-linear-gradient(90deg,#5a2f2f 0px,#6b3333 12px,#4a2323 22px,#5e2e2e 36px)',
        oak: 'repeating-linear-gradient(90deg,#7c623d 0px,#8a6c44 12px,#6d5536 22px,#7f633d 36px)',
        ebony: 'repeating-linear-gradient(90deg,#2a2a2a 0px,#303030 12px,#222 22px,#2b2b2b 36px)',
      }[woodPreset || 'walnut'];

      return (
        <div className="min-h-screen p-6" style={{ background: `radial-gradient(100% 60% at 50% 0%, #4d3a2a 0%, #3b2a1f 40%, #2e2119 70%, #241a14 100%)` }}>
          <div className="max-w-6xl mx-auto p-4 rounded-[22px] border-[14px]" style={{ background: wood, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.5)', borderColor: '#2a1b12' }}>
            <div className="p-8 border-[6px] border-[#080808] rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),inset_0_-3px_8px_rgba(0,0,0,0.6),0_10px_0_#333]" style={{ background: `linear-gradient(to bottom, ${panelHue}, #1b1b1b)` }}>

              {/* Header */}
              <div className="flex items-center justify-between mb-8 border-b border-[#3a3a3a] pb-4">
                <div className="flex items-center gap-6">
                  <div className="flex gap-2">
                    <div className={`rounded-full ${led(true)} w-4 h-4`}/>
                    <div className={`rounded-full ${led(isPlaying)} w-4 h-4`}/>
                    <div className="w-4 h-4 rounded-full border border-black bg-gradient-to-b from-[#222] to-black" />
                  </div>
                  <span className="font-mono tracking-[0.3em] text-2xl font-bold text-[#e7d6a3] drop-shadow">DR-16</span>
                  <div className="text-[10px] font-mono tracking-[0.2em] text-[#222] px-2 py-1 border border-[#3a3a3a] bg-gradient-to-b from-[#efeadc] to-[#cfc7b6] rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">ELECTRONIC MUSIC SYSTEM</div>
                </div>
                <div className="flex items-center gap-6">
                  <button onClick={() => (isPlaying ? stop() : start())} className={`px-8 py-3 border border-[#090909] rounded-md font-mono tracking-widest text-lg font-bold text-[#efeadc] ${isPlaying ? "bg-gradient-to-b from-[#b22a2a] to-[#6e1717] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_3px_0_#000]" : "bg-gradient-to-b from-[#2b2b2b] to-[#141414] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_3px_0_#000]"}`}>
                    {isPlaying ? "STOP" : "START"}
                  </button>
                  <div className={`w-6 h-6 rounded-full border border-black ${isPlaying ? 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.9),inset_0_1px_2px_rgba(255,255,255,0.6)]' : 'bg-[#2a0e0e]'} `} />
                </div>
              </div>

              {/* Controls (simplified sliders to avoid CSS conflicts) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="p-4 border border-[#050505] rounded-md" style={{ background: `linear-gradient(to bottom, ${panelHue}, #1b1b1b)` }}>
                  <div className={`${labelClass} mb-4 border-b border-[#3a3a3a] pb-2`}>SEQUENCER PARAMETERS</div>
                  <div className="flex items-center gap-4">
                    <span className={`${labelClass} w-20`}>TEMPO</span>
                    <input type="range" min={60} max={200} step={1} value={bpm} onChange={(e:any)=>setBpm(parseInt(e.target.value))} className="w-48" />
                    <span className="text-xs tabular-nums font-mono font-bold bg-gradient-to-b from-[#2a2a2a] to-[#111] text-[#e7d6a3] px-3 py-1 border border-black rounded w-24 text-center">{bpm} BPM</span>
                  </div>
                  <div className="h-3" />
                  <div className="flex items-center gap-4">
                    <span className={`${labelClass} w-20`}>SWING</span>
                    <input type="range" min={0} max={75} step={5} value={swing} onChange={(e:any)=>setSwing(parseInt(e.target.value))} className="w-48" />
                    <span className="text-xs tabular-nums font-mono font-bold bg-gradient-to-b from-[#2a2a2a] to-[#111] text-[#e7d6a3] px-3 py-1 border border-black rounded w-24 text-center">{swing}%</span>
                  </div>
                  <div className="h-3" />
                  <div className="flex items-center gap-4">
                    <span className={`${labelClass} w-20`}>OUTPUT</span>
                    <input type="range" min={0} max={1} step={0.01} value={master} onChange={(e:any)=>setMaster(parseFloat(e.target.value))} className="w-48" />
                    <span className="text-xs tabular-nums font-mono font-bold bg-gradient-to-b from-[#2a2a2a] to-[#111] text-[#e7d6a3] px-3 py-1 border border-black rounded w-24 text-center">{master.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4 border border-[#050505] rounded-md" style={{ background: `linear-gradient(to bottom, ${panelHue}, #1b1b1b)` }}>
                  <div className={`${labelClass} mb-4 border-b border-[#3a3a3a] pb-2`}>PATTERN STORAGE</div>
                  <div className="flex items-center gap-3">
                    <span className={`${labelClass} w-16`}>BANK</span>
                    <div className="flex gap-2">
                      {Array.from({ length: NUM_BANKS }).map((_, i) => (
                        <button key={i} onClick={() => !isPlaying && setCurrentBank(i)} disabled={isPlaying} className={`w-10 h-10 rounded-md border border-[#0b0b0b] font-mono text-sm font-bold text-[#efeadc] bg-gradient-to-b from-[#2b2b2b] to-[#141414]`}>{i + 1}</button>
                      ))}
                    </div>
                    <button onClick={clearBank} className="ml-4 px-4 py-2 text-sm font-mono font-bold rounded-md text-[#efeadc] border border-[#0b0b0b] bg-gradient-to-b from-[#2b2b2b] to-[#141414]">CLEAR</button>
                  </div>
                </div>
              </div>

              {/* Step Numbers */}
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                {Array.from({ length: STEPS }).map((_, i) => (
                  <div key={i} className={`${labelClass} text-center font-bold text-[#bfb69f]`}>
                    {(i + 1).toString().padStart(2, "0")}
                  </div>
                ))}
              </div>

              {/* Accent Row */}
              <div className="p-4 border border-[#050505] rounded-md mb-6" style={{ background: `linear-gradient(to bottom, ${panelHue}, #1b1b1b)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="px-3 py-2 rounded-md border border-[#0b0b0b] bg-gradient-to-b from-[#b22a2a] to-[#6e1717] text-[#efeadc] font-mono text-sm font-bold tracking-wider">
                    ACCENT
                  </div>
                  <div className={`${labelClass} text-[#bfb69f]`}>DYNAMIC EMPHASIS PATTERN</div>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                  {Array.from({ length: STEPS }).map((_, i) => {
                    const active = accentPattern[i];
                    const beat = i % 4 === 0;
                    const current = isPlaying && currentStep === i;
                    const showDivider = showMeasureLines && i % 4 === 0 && i !== 0;
                    return (
                      <button key={i} onClick={() => toggleAccent(i)} className="group relative" title={`Accent • Step ${i + 1}`}>
                        <StepButton active={active} beat={beat} current={current} showDivider={showDivider} padHeight={padHeight} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instrument Patterns */}
              <div className="grid gap-4">
                {INSTRUMENTS.map((inst) => (
                  <div key={inst.id} className="p-3 border border-[#050505] rounded-md" style={{ background: `linear-gradient(to bottom, ${panelHue}, #1b1b1b)` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center">
                        <InstIcon id={inst.id} size={iconSize} />
                        <div className="text-[11px] tracking-[0.25em] font-mono text-[#e7d6a3] opacity-90 select-none">{inst.name}</div>
                      </div>
                      <div className="text-sm font-mono font-bold text-[#efeadc] px-2 py-1 rounded-md border border-[#0b0b0b] bg-gradient-to-b from-[#2b2b2b] to-[#141414]">{inst.key}</div>
                      <button onClick={() => clearRow(inst.id)} className="ml-3 px-3 py-1 text-sm font-mono font-bold rounded-md text-[#efeadc] border border-[#0b0b0b] bg-gradient-to-b from-[#2b2b2b] to-[#141414]">CLEAR</button>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))` }}>
                      {Array.from({ length: STEPS }).map((_, i) => {
                        const active = pattern[inst.id][i];
                        const beat = i % 4 === 0;
                        const current = isPlaying && currentStep === i;
                        const accent = accentPattern[i];
                        const showDivider = showMeasureLines && i % 4 === 0 && i !== 0;
                        return (
                          <button key={i} onClick={() => togglePad(inst.id, i)} className="group relative" title={`${inst.name} • Step ${i + 1}${accent ? ' • ACCENT' : ''}`}>
                            <StepButton active={active} beat={beat} current={current} accent={accent && active} showDivider={showDivider} padHeight={padHeight} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 flex items-center justify-between text-xs font-mono font-bold border-t border-[#3a3a3a] pt-4 text-[#bfb69f]">
                <span>EDUCATIONAL RESEARCH DEPARTMENT • CBS MUSICAL INSTRUMENTS</span>
                <span>PATTERN BANK {currentBank + 1}/4 • SWING {swing}% • STATUS: {isPlaying ? 'RUNNING' : 'STOPPED'}</span>
              </div>
            </div>
          </div>

          {/* Minimal slider styles kept */}
          <style jsx>{`
            input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #ffffff 0%, #bdbdbd 30%, #6a6a6a 70%, #1a1a1a 100%); border: 1px solid #000; box-shadow: 0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 2px rgba(0,0,0,0.6); }
            input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #ffffff 0%, #bdbdbd 30%, #6a6a6a 70%, #1a1a1a 100%); border: 1px solid #000; box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 2px rgba(0,0,0,0.6); }
            input[type=range]::-webkit-slider-runnable-track { height: 6px; background: linear-gradient(#0f0f0f, #1c1c1c); border-radius: 3px; border: 1px solid #000; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6); }
            input[type=range]::-moz-range-track { height: 6px; background: linear-gradient(#0f0f0f, #1c1c1c); border-radius: 3px; border: 1px solid #000; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.6); }
          `}</style>
        </div>
      );
    }

    function StepButton({ active, beat, current, accent, showDivider, padHeight }: any) {
      return (
        <div className="relative">
          {showDivider && (<div className="absolute inset-y-0 -left-1 w-px bg-white/15" />)}
          <div className={`${padHeight} w-full rounded-md border border-[#141414] ${active ? 'bg-gradient-to-b from-[#3c3c3c] to-[#0f0f0f] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_2px_0_#000]' : 'bg-gradient-to-b from-[#faf7ef] to-[#d8d2c6] shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.15),0_2px_0_#000]'} ${accent ? 'ring-2 ring-red-600' : ''}`} />
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 ${current ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9),inset_0_1px_2px_rgba(255,255,255,0.6)]' : 'bg-[#3a0d0d]'} rounded-full border border-black ${!current && beat ? 'opacity-70' : ''}`} />
          {accent && <div className="absolute top-1 right-1 w-2 h-2 rounded-sm bg-red-700 shadow-[0_0_6px_rgba(185,28,28,0.8)] border border-black" />}
        </div>
      );
    }
