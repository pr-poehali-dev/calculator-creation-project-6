import { useState, useEffect, useRef } from "react";

type Operator = "+" | "-" | "×" | "÷" | null;
type BattleState = "idle" | "fighting" | "victory";

const RADIATION_LEVELS = [
  { max: 10, label: "НОРМА", color: "#00ff41", danger: 0 },
  { max: 50, label: "ПОВЫШЕН", color: "#aaff00", danger: 1 },
  { max: 200, label: "ОПАСНО", color: "#ffaa00", danger: 2 },
  { max: Infinity, label: "КРИТИЧНО", color: "#ff2200", danger: 3 },
];

function getRadiationLevel(value: number) {
  const abs = Math.abs(value);
  return RADIATION_LEVELS.find((l) => abs <= l.max) || RADIATION_LEVELS[3];
}

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
  color: string;
  type: "spark" | "bolt" | "orb";
}

interface Lightning {
  id: number;
  points: { x: number; y: number }[];
  life: number;
  color: string;
}

function generateLightningPath(x1: number, y1: number, x2: number, y2: number, jaggedness = 8): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jaggedness * 2;
    const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jaggedness;
    points.push({ x: mx, y: my });
  }
  points.push({ x: x2, y: y2 });
  return points;
}

function pointsToPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function CEBar({ value }: { value: number }) {
  const abs = Math.min(Math.abs(value), 9999);
  const pct = Math.min((abs / 9999) * 100, 100);
  const ceLevel = pct < 30 ? { label: "低 LOW", color: "#00ff41" }
    : pct < 60 ? { label: "中 MID", color: "#aaff00" }
    : pct < 85 ? { label: "高 HIGH", color: "#ffaa00" }
    : { label: "無限 MAX", color: "#ff2200" };

  return (
    <div className="ce-bar-wrap">
      <div className="ce-bar-header">
        <span className="ce-bar-title">呪力 ПРОКЛЯТАЯ ЭНЕРГИЯ</span>
        <span className="ce-bar-level" style={{ color: ceLevel.color }}>{ceLevel.label}</span>
      </div>
      <div className="ce-bar-track">
        <div className="ce-bar-fill" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, #1a0030, ${ceLevel.color})`,
          boxShadow: `0 0 12px ${ceLevel.color}88, inset 0 0 6px rgba(0,0,0,0.5)`,
        }} />
        <div className="ce-bar-glow" style={{ left: `${pct}%`, backgroundColor: ceLevel.color }} />
      </div>
      <div className="ce-cursed-marks">
        {["卍", "呪", "術", "廻", "戦"].map((c, i) => (
          <span key={i} className="ce-mark" style={{
            color: (i / 4) * 100 <= pct ? ceLevel.color : "#1a1a1a",
            textShadow: (i / 4) * 100 <= pct ? `0 0 8px ${ceLevel.color}` : "none",
          }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function BattleArena({
  state, fighter1, fighter2, operator, result, particles, lightnings, color,
}: {
  state: BattleState; fighter1: string; fighter2: string;
  operator: string; result: string;
  particles: Particle[]; lightnings: Lightning[]; color: string;
}) {
  if (state === "idle") return null;

  return (
    <div className={`battle-arena ${state === "fighting" ? "arena-fighting" : "arena-victory"}`}>
      <div className="arena-bg-pulse" />

      <svg className="lightning-layer" viewBox="0 0 308 120" preserveAspectRatio="none">
        {lightnings.map(l => (
          <g key={l.id}>
            <path d={pointsToPath(l.points)} stroke={l.color} strokeWidth="3"
              strokeOpacity={l.life * 0.6} fill="none" strokeLinecap="round" filter="url(#glow)" />
            <path d={pointsToPath(l.points)} stroke="#fff" strokeWidth="1"
              strokeOpacity={l.life * 0.9} fill="none" strokeLinecap="round" />
          </g>
        ))}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      <div className="arena-particles">
        {particles.map(p => (
          <div key={p.id} className={`particle particle-${p.type}`} style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            opacity: p.life,
            transform: `scale(${p.life}) rotate(${p.x * 3}deg)`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }} />
        ))}
      </div>

      <div className="arena-fighters">
        <div className={`epic-fighter left ${state === "fighting" ? "charging" : "defeated"}`}>
          <div className="fighter-aura" style={{ boxShadow: `0 0 30px ${color}, 0 0 60px ${color}44` }} />
          <div className="fighter-sigil">呪</div>
          <div className="fighter-number" style={{ color, textShadow: `0 0 20px ${color}` }}>{fighter1}</div>
          <div className="fighter-title">術師</div>
        </div>

        <div className={`clash-center ${state === "fighting" ? "clashing" : "resolved"}`}>
          {state === "fighting" ? (
            <>
              <div className="clash-symbol" style={{ color }}>
                <span className="clash-op-text">{operator}</span>
              </div>
              <div className="clash-shockwave" style={{ borderColor: color }} />
              <div className="clash-shockwave delay2" style={{ borderColor: color }} />
            </>
          ) : (
            <div className="victory-burst" style={{ color }}>✦</div>
          )}
        </div>

        <div className={`epic-fighter right ${state === "fighting" ? "charging" : "defeated"}`}>
          <div className="fighter-aura" style={{ boxShadow: `0 0 30px #8800ff, 0 0 60px #8800ff44` }} />
          <div className="fighter-sigil" style={{ color: "#8800ff" }}>式</div>
          <div className="fighter-number" style={{ color: "#bb44ff", textShadow: "0 0 20px #8800ff" }}>{fighter2}</div>
          <div className="fighter-title">神</div>
        </div>
      </div>

      {state === "victory" && (
        <div className="epic-victory">
          <div className="victory-kanji">勝</div>
          <div className="victory-content" style={{ color, textShadow: `0 0 30px ${color}, 0 0 60px ${color}66` }}>
            <span className="victory-label">領域展開</span>
            <span className="victory-number">{result}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RadiationIcon({ danger }: { danger: number }) {
  return (
    <div className={`rad-icon-wrap danger-${danger}`}>
      <svg viewBox="0 0 64 64" width="36" height="36">
        <circle cx="32" cy="32" r="6" fill="currentColor" />
        <path d="M32 26 L20 8 A26 26 0 0 1 44 8 Z" fill="currentColor" opacity="0.9"/>
        <path d="M32 26 L8 38 A26 26 0 0 1 8 20 Z" fill="currentColor" opacity="0.9" transform="rotate(120 32 32)"/>
        <path d="M32 26 L8 38 A26 26 0 0 1 8 20 Z" fill="currentColor" opacity="0.9" transform="rotate(240 32 32)"/>
      </svg>
    </div>
  );
}

interface EasterEggParticle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; size: number; color: string; rotation: number; rotSpeed: number;
}

function EasterEgg67({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"appear" | "explode" | "fade">("appear");
  const [eParticles, setEParticles] = useState<EasterEggParticle[]>([]);
  const idRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const COLORS = ["#ff0044","#ff6600","#ffdd00","#00ff88","#00aaff","#cc00ff","#ff00cc","#ffffff"];

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("explode");
      const ps: EasterEggParticle[] = Array.from({ length: 120 }).map(() => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 18;
        return {
          id: ++idRef.current,
          x: 0, y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          life: 1,
          size: 4 + Math.random() * 16,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 20,
        };
      });
      setEParticles(ps);

      let frame = 0;
      const animate = () => {
        frame++;
        setEParticles(prev => prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.35, life: p.life - 0.018, rotation: p.rotation + p.rotSpeed }))
          .filter(p => p.life > 0)
        );
        if (frame < 100) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, 800);

    const t2 = setTimeout(() => setPhase("fade"), 1400);
    const t3 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className={`easter-overlay ${phase}`}>
      <div className="easter-bg-flash" />
      {eParticles.map(p => (
        <div key={p.id} className="easter-particle" style={{
          left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
          width: p.size, height: p.size,
          backgroundColor: p.color,
          opacity: p.life,
          transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          boxShadow: `0 0 ${p.size}px ${p.color}`,
        }} />
      ))}
      <div className={`easter-number ${phase}`}>
        <span className="easter-67">67</span>
        <div className="easter-sub">ШЕСТЬДЕСЯТ СЕМЬ</div>
        <div className="easter-sub2">🎆 ЛЕГЕНДАРНОЕ ЧИСЛО 🎆</div>
      </div>
    </div>
  );
}

function makeEasterEgg(
  num: number | string,
  label: string,
  sub: string,
  sub2: string,
  colors: string[],
  bgAnim: string,
  numClass: string,
) {
  return function EasterEggGeneric({ onDone }: { onDone: () => void }) {
    const [phase, setPhase] = useState<"appear" | "explode" | "fade">("appear");
    const [eParticles, setEParticles] = useState<EasterEggParticle[]>([]);
    const idRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
      const t1 = setTimeout(() => {
        setPhase("explode");
        const ps: EasterEggParticle[] = Array.from({ length: 150 }).map(() => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 22;
          return {
            id: ++idRef.current,
            x: 0, y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 5,
            life: 1,
            size: 4 + Math.random() * 18,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 22,
          };
        });
        setEParticles(ps);
        let frame = 0;
        const animate = () => {
          frame++;
          setEParticles(prev => prev
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.35, life: p.life - 0.016, rotation: p.rotation + p.rotSpeed }))
            .filter(p => p.life > 0)
          );
          if (frame < 120) rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
      }, 700);
      const t2 = setTimeout(() => setPhase("fade"), 1500);
      const t3 = setTimeout(() => onDone(), 3400);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return (
      <div className={`easter-overlay ${phase} ${bgAnim}`}>
        <div className="easter-bg-flash" />
        {eParticles.map(p => (
          <div key={p.id} className="easter-particle" style={{
            left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            opacity: p.life,
            transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            boxShadow: `0 0 ${p.size}px ${p.color}`,
          }} />
        ))}
        <div className={`easter-number ${phase}`}>
          <span className={numClass}>{num}</span>
          <div className="easter-sub" style={{ color: colors[0], textShadow: `0 0 20px ${colors[0]}` }}>{label}</div>
          <div className="easter-sub2">{sub}</div>
          <div className="easter-sub2">{sub2}</div>
        </div>
      </div>
    );
  };
}

const EasterEgg1488 = makeEasterEgg(
  "1488",
  "ЭТО ПЛОХОЕ ЧИСЛО",
  "⚠️ СИСТЕМА ЗАФИКСИРОВАЛА ЗАПРОС ⚠️",
  "🚨 ФСБ УЖЕ ВЫЕХАЛА 🚨",
  ["#ff0000","#ff3300","#cc0000","#ff6600","#ffaa00","#ffffff"],
  "bg-red",
  "easter-1488",
);

const EasterEgg52 = makeEasterEgg(
  "52",
  "ПЯТЬДЕСЯТ ДВА",
  "🃏 КОЛОДА КАРТ — 52 ШТУКИ 🃏",
  "♠ ♥ ♦ ♣ JACKPOT ♣ ♦ ♥ ♠",
  ["#ffdd00","#ff8800","#00ffcc","#ff00cc","#ffffff","#aaffff"],
  "bg-casino",
  "easter-52",
);

const EasterEgg42 = makeEasterEgg(
  "42",
  "ОТВЕТ НА ГЛАВНЫЙ ВОПРОС",
  "ЖИЗНИ, ВСЕЛЕННОЙ И ВСЕГО ОСТАЛЬНОГО",
  "📖 Автостопом по галактике 🚀",
  ["#00ff88","#00aaff","#aaffcc","#ffffff","#88ffff","#00ffff"],
  "bg-space",
  "easter-42",
);

const EasterEggDivZero = makeEasterEgg(
  "∞",
  "МГЕ МУЖИК УЖЕ ЕДЕТ",
  "ВСАЖИВАТЬ ТЕБЕ СВОЙ 🍆",
  "НЕ ДЕЛИ НА НОЛЬ, ПРИДУРОК",
  ["#ff0066","#ff33cc","#ff6600","#ffffff","#ff0000","#ff99ff"],
  "bg-red",
  "easter-42",
);

export default function Index() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");
  const [pulse, setPulse] = useState(false);
  const [shake, setShake] = useState(false);
  const [tick, setTick] = useState(0);
  const [easter67, setEaster67] = useState(false);
  const [easter1488, setEaster1488] = useState(false);
  const [easter52, setEaster52] = useState(false);
  const [easter42, setEaster42] = useState(false);
  const [easterDivZero, setEasterDivZero] = useState(false);

  const [battleState, setBattleState] = useState<BattleState>("idle");
  const [battleF1, setBattleF1] = useState("");
  const [battleF2, setBattleF2] = useState("");
  const [battleOp, setBattleOp] = useState("");
  const [battleResult, setBattleResult] = useState("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lightnings, setLightnings] = useState<Lightning[]>([]);
  const particleIdRef = useRef(0);
  const lightningIdRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lightningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const numValue = parseFloat(display) || 0;
  const level = getRadiationLevel(numValue);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
      if (Math.random() < 0.3) setPulse((p) => !p);
    }, 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (level.danger >= 2) { setShake(true); setTimeout(() => setShake(false), 400); }
  }, [display]);

  const playEpicSound = () => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const playNote = (freq: number, start: number, dur: number, vol = 0.3) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const distortion = ctx.createWaveShaper();

        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + 400) * x) / (Math.PI + 400 * Math.abs(x));
        }
        distortion.curve = curve;

        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.1);
      };

      // Judas riff (approximation: heavy metal opening riff)
      const riff = [
        [146.83, 0.0, 0.12], [146.83, 0.13, 0.12], [146.83, 0.26, 0.08],
        [196.00, 0.35, 0.15], [174.61, 0.52, 0.12], [155.56, 0.66, 0.20],
        [130.81, 0.88, 0.30], [146.83, 1.20, 0.25], [164.81, 1.47, 0.20],
        [196.00, 1.69, 0.35],
      ];
      riff.forEach(([f, s, d]) => playNote(f, s, d, 0.25));

      // Power chord stabs
      [[196, 0.0], [196, 0.13], [233, 0.35], [220, 0.66], [196, 0.88]].forEach(([f, s]) => {
        playNote(f * 1.5, s, 0.1, 0.15);
        playNote(f * 2, s, 0.1, 0.1);
      });
    } catch { /* audio blocked */ }
  };

  const spawnLightnings = (color: string) => {
    const bolts: Lightning[] = Array.from({ length: 6 }).map(() => ({
      id: ++lightningIdRef.current,
      points: generateLightningPath(
        20 + Math.random() * 50, 20 + Math.random() * 80,
        240 + Math.random() * 50, 20 + Math.random() * 80,
        12
      ),
      life: 1,
      color: Math.random() > 0.4 ? "#1a0030" : color,
    }));
    setLightnings(bolts);
    setTimeout(() => setLightnings([]), 200);
  };

  const spawnParticles = (color: string) => {
    const newP: Particle[] = Array.from({ length: 40 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 7;
      const type = Math.random() < 0.3 ? "bolt" : Math.random() < 0.5 ? "orb" : "spark";
      return {
        id: ++particleIdRef.current,
        x: (Math.random() - 0.5) * 30,
        y: (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: type === "orb" ? 8 + Math.random() * 8 : 3 + Math.random() * 5,
        color: type === "bolt" ? "#1a0030" : Math.random() > 0.5 ? color : "#ffffff",
        type,
      };
    });
    setParticles(newP);

    let frame = 0;
    const animate = () => {
      frame++;
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.25, life: p.life - 0.025 }))
          .filter((p) => p.life > 0)
      );
      if (frame < 60) animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) { setDisplay(digit); setWaitingForOperand(false); }
    else setDisplay(display === "0" ? digit : display + digit);
  };

  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay("0."); setWaitingForOperand(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const handleOperator = (op: Operator) => {
    const value = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, value, operator);
      setDisplay(String(result)); setExpression(`${result} ${op}`); setPrevValue(result);
    } else {
      setPrevValue(value); setExpression(`${display} ${op}`);
    }
    setOperator(op); setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (prevValue === null || !operator) return;
    const value = parseFloat(display);
    const isDivByZero = operator === "÷" && value === 0;
    const result = calculate(prevValue, value, operator);
    const rounded = Math.round(result * 1e10) / 1e10;

    setBattleF1(String(prevValue));
    setBattleF2(String(value));
    setBattleOp(operator);
    setBattleResult(isDivByZero ? "∞" : String(rounded));
    setBattleState("fighting");

    playEpicSound();
    spawnParticles(level.color);

    lightningTimerRef.current = setInterval(() => {
      spawnLightnings(level.color);
    }, 180);

    setTimeout(() => {
      if (lightningTimerRef.current) clearInterval(lightningTimerRef.current);
      spawnParticles(level.color);
      spawnLightnings(level.color);
      setBattleState("victory");
      setDisplay(isDivByZero ? "МГЕ" : String(rounded));
      setExpression(`${prevValue} ${operator} ${value} =`);
      setPrevValue(null); setOperator(null); setWaitingForOperand(true);
    }, 2200);

    setTimeout(() => {
      setBattleState("idle");
      setParticles([]); setLightnings([]);
      if (isDivByZero) { setEasterDivZero(true); return; }
      if (rounded === 67) setEaster67(true);
      if (rounded === 1488) setEaster1488(true);
      if (rounded === 52) setEaster52(true);
      if (rounded === 42) setEaster42(true);
    }, 4500);
  };

  const handleClear = () => {
    setDisplay("0"); setPrevValue(null); setOperator(null);
    setWaitingForOperand(false); setExpression("");
    setBattleState("idle"); setParticles([]); setLightnings([]);
    if (lightningTimerRef.current) clearInterval(lightningTimerRef.current);
  };

  const handleToggleSign = () => setDisplay(String(parseFloat(display) * -1));
  const handlePercent = () => setDisplay(String(parseFloat(display) / 100));
  const formatDisplay = (val: string) => val.length > 12 ? parseFloat(val).toExponential(4) : val;

  const buttons = [
    { label: "C", type: "func", action: handleClear },
    { label: "+/-", type: "func", action: handleToggleSign },
    { label: "%", type: "func", action: handlePercent },
    { label: "÷", type: "op", action: () => handleOperator("÷") },
    { label: "7", type: "num", action: () => inputDigit("7") },
    { label: "8", type: "num", action: () => inputDigit("8") },
    { label: "9", type: "num", action: () => inputDigit("9") },
    { label: "×", type: "op", action: () => handleOperator("×") },
    { label: "4", type: "num", action: () => inputDigit("4") },
    { label: "5", type: "num", action: () => inputDigit("5") },
    { label: "6", type: "num", action: () => inputDigit("6") },
    { label: "-", type: "op", action: () => handleOperator("-") },
    { label: "1", type: "num", action: () => inputDigit("1") },
    { label: "2", type: "num", action: () => inputDigit("2") },
    { label: "3", type: "num", action: () => inputDigit("3") },
    { label: "+", type: "op", action: () => handleOperator("+") },
    { label: "0", type: "num-wide", action: () => inputDigit("0") },
    { label: ".", type: "num", action: inputDecimal },
    { label: "=", type: "eq", action: handleEquals },
  ];

  return (
    <div className="calc-root">
      {easter67 && <EasterEgg67 onDone={() => setEaster67(false)} />}
      {easter1488 && <EasterEgg1488 onDone={() => setEaster1488(false)} />}
      {easter52 && <EasterEgg52 onDone={() => setEaster52(false)} />}
      {easter42 && <EasterEgg42 onDone={() => setEaster42(false)} />}
      {easterDivZero && <EasterEggDivZero onDone={() => setEasterDivZero(false)} />}
      <div className="scanlines" />
      <div className={`calc-body ${shake ? "shake" : ""} ${battleState === "fighting" ? "body-battle" : ""}`}>
        <div className="calc-header">
          <RadiationIcon danger={level.danger} />
          <div className="header-text">
            <div className="device-name">ВАДИМ</div>
            <div className="device-model">КВ-3000 · КАЛЬКУЛЯТОР</div>
          </div>
          <div className="status-dot-wrap">
            <div className={`status-dot ${pulse ? "active" : ""}`} style={{ backgroundColor: level.color }} />
            <div className="status-dot-label">ВКЛ</div>
          </div>
        </div>

        <CEBar value={numValue} />

        <BattleArena
          state={battleState} fighter1={battleF1} fighter2={battleF2}
          operator={battleOp} result={battleResult}
          particles={particles} lightnings={lightnings} color={level.color}
        />

        {battleState === "idle" && (
          <div className="display-zone">
            <div className="display-expr">{expression || "\u00A0"}</div>
            <div className="display-main" style={{ color: level.color, textShadow: `0 0 20px ${level.color}66, 0 0 40px ${level.color}33` }}>
              {formatDisplay(display)}
            </div>
            <div className="display-unit" style={{ color: level.color + "99" }}>мкЗв/ч</div>
          </div>
        )}

        <div className="buttons-grid">
          {buttons.map((btn, i) => (
            <button key={i} className={`calc-btn btn-${btn.type}`} onClick={btn.action}
              style={btn.type === "op" ? { color: level.color, borderColor: level.color + "55" } : undefined}>
              {btn.label}
            </button>
          ))}
        </div>

        <div className="calc-footer">
          <span>☢ ГОСТ Р 52350</span>
          <span>ЧАЭС · 1986</span>
          <span>SN: 00{tick % 99 + 1}</span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Russo+One&family=Oswald:wght@300;400;600;700&display=swap');

        :root {
          --green: #00ff41;
          --bg-dark: #050a05;
          --bg-panel: #0a130a;
          --bg-btn: #0f1f0f;
          --border: #1a3a1a;
          --text-dim: #3a6e3a;
          --purple: #8800ff;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .calc-root {
          min-height: 100vh;
          background: var(--bg-dark);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Share Tech Mono', monospace;
          position: relative; overflow: hidden;
        }
        .calc-root::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 60% at 50% 50%, #0a2a0a 0%, #020802 100%);
          z-index: 0;
        }
        .scanlines {
          position: fixed; inset: 0;
          background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px);
          pointer-events: none; z-index: 100;
        }
        .calc-body {
          position: relative; z-index: 1; width: 340px;
          background: var(--bg-panel);
          border: 1px solid #1e3d1e; border-radius: 12px; padding: 20px 16px 16px;
          box-shadow: 0 0 40px rgba(0,255,65,0.1), 0 0 80px rgba(0,255,65,0.05), inset 0 1px 0 rgba(0,255,65,0.15);
          transition: box-shadow 0.3s;
        }
        .body-battle {
          box-shadow: 0 0 60px rgba(136,0,255,0.4), 0 0 120px rgba(0,255,65,0.2), inset 0 1px 0 rgba(136,0,255,0.3) !important;
          animation: body-shake 0.1s infinite;
        }
        @keyframes body-shake {
          0%,100% { transform: translate(0,0); }
          25% { transform: translate(-2px, 1px); }
          75% { transform: translate(2px, -1px); }
        }
        .shake { animation: shake 0.4s ease; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-0.5deg); }
          40% { transform: translateX(4px) rotate(0.5deg); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        /* HEADER */
        .calc-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
        }
        .rad-icon-wrap { padding: 6px; border-radius: 50%; border: 1px solid var(--border); }
        .rad-icon-wrap.danger-0 { color: #00ff41; border-color: #00ff4133; }
        .rad-icon-wrap.danger-1 { color: #aaff00; border-color: #aaff0033; }
        .rad-icon-wrap.danger-2 { color: #ffaa00; border-color: #ffaa0033; animation: blink 1s infinite; }
        .rad-icon-wrap.danger-3 { color: #ff2200; border-color: #ff220033; animation: blink 0.5s infinite; }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .header-text { flex: 1; }
        .device-name { font-family:'Russo One',sans-serif; font-size:18px; color:var(--green); letter-spacing:0.15em; text-shadow:0 0 10px rgba(0,255,65,0.5); }
        .device-model { font-size:9px; color:var(--text-dim); letter-spacing:0.1em; margin-top:2px; }
        .status-dot-wrap { text-align:center; }
        .status-dot { width:10px; height:10px; border-radius:50%; margin:0 auto 3px; transition:opacity 0.3s; }
        .status-dot.active { box-shadow:0 0 8px currentColor; }
        .status-dot-label { font-size:8px; color:var(--text-dim); letter-spacing:0.1em; }

        /* CE BAR */
        .ce-bar-wrap {
          background: rgba(0,0,0,0.5); border: 1px solid #2a0050;
          border-radius: 6px; padding: 8px 10px; margin-bottom: 12px;
        }
        .ce-bar-header {
          display: flex; justify-content: space-between;
          font-size: 9px; letter-spacing: 0.08em; margin-bottom: 6px;
        }
        .ce-bar-title { color: #5a3a7a; }
        .ce-bar-level { font-weight: bold; font-size: 10px; }
        .ce-bar-track {
          height: 10px; background: #0a0015; border-radius: 5px;
          position: relative; overflow: hidden; border: 1px solid #2a0050;
        }
        .ce-bar-fill {
          height: 100%; border-radius: 5px;
          transition: width 0.4s cubic-bezier(0.25,1.5,0.5,1);
        }
        .ce-bar-glow {
          position: absolute; top: 0; width: 4px; height: 100%;
          filter: blur(4px); transform: translateX(-50%);
          transition: left 0.4s;
        }
        .ce-cursed-marks {
          display: flex; justify-content: space-between;
          margin-top: 5px; padding: 0 2px;
        }
        .ce-mark {
          font-size: 13px; transition: color 0.3s, text-shadow 0.3s;
          font-family: serif;
        }

        /* BATTLE ARENA */
        .battle-arena {
          position: relative; border-radius: 8px;
          margin-bottom: 12px; overflow: hidden;
          min-height: 130px;
          background: radial-gradient(ellipse at 50% 50%, #0d0020 0%, #050008 100%);
          border: 1px solid #2a0050;
        }
        .arena-fighting {
          border-color: var(--purple);
          box-shadow: inset 0 0 30px rgba(136,0,255,0.2), 0 0 20px rgba(136,0,255,0.3);
        }
        .arena-victory {
          border-color: #00ff41;
          box-shadow: inset 0 0 30px rgba(0,255,65,0.15), 0 0 20px rgba(0,255,65,0.2);
        }
        .arena-bg-pulse {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(136,0,255,0.15) 0%, transparent 70%);
          animation: bg-pulse 0.3s ease infinite alternate;
        }
        @keyframes bg-pulse {
          from { opacity: 0.5; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1.05); }
        }

        /* LIGHTNING SVG */
        .lightning-layer {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 2;
        }

        /* PARTICLES */
        .arena-particles { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
        .particle { position: absolute; border-radius: 50%; pointer-events: none; }
        .particle-bolt { border-radius: 2px; transform-origin: center; }
        .particle-orb { border-radius: 50%; filter: blur(2px); }

        /* FIGHTERS */
        .arena-fighters {
          position: relative; z-index: 4;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 10px 8px;
        }
        .epic-fighter {
          width: 90px; text-align: center; position: relative;
        }
        .fighter-aura {
          position: absolute; inset: -8px; border-radius: 50%;
          animation: aura-pulse 0.4s ease infinite alternate;
          pointer-events: none;
        }
        @keyframes aura-pulse {
          from { transform: scale(0.9); opacity: 0.6; }
          to   { transform: scale(1.1); opacity: 1; }
        }
        .fighter-sigil {
          font-size: 20px; font-family: serif; color: var(--green);
          text-shadow: 0 0 10px var(--green);
          animation: sigil-spin 2s linear infinite;
        }
        @keyframes sigil-spin {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        .fighter-number {
          font-family: 'Share Tech Mono', monospace;
          font-size: 22px; font-weight: bold; line-height: 1;
          margin: 2px 0;
        }
        .fighter-title { font-size: 8px; color: #5a5a8a; letter-spacing: 0.15em; }
        .charging { animation: fighter-charge 0.15s ease infinite alternate; }
        @keyframes fighter-charge {
          from { transform: scale(1) translateX(0); }
          to   { transform: scale(1.08) translateX(6px); }
        }
        .epic-fighter.right.charging { animation: fighter-charge-r 0.15s ease infinite alternate; }
        @keyframes fighter-charge-r {
          from { transform: scale(1) translateX(0); }
          to   { transform: scale(1.08) translateX(-6px); }
        }
        .defeated { animation: defeated-anim 0.5s ease forwards; }
        @keyframes defeated-anim {
          0%   { transform: scale(1.2); opacity: 1; }
          50%  { transform: scale(0.8) rotate(10deg); opacity: 0.5; }
          100% { transform: scale(0.6); opacity: 0.2; }
        }

        /* CLASH CENTER */
        .clash-center {
          width: 60px; text-align: center; position: relative; flex-shrink: 0;
        }
        .clash-symbol {
          font-size: 30px; font-weight: bold; position: relative; z-index: 2;
          animation: clash-explode 0.1s ease infinite alternate;
        }
        @keyframes clash-explode {
          from { transform: scale(1); filter: brightness(1); }
          to   { transform: scale(1.5); filter: brightness(2); }
        }
        .clash-op-text { display: block; }
        .clash-shockwave {
          position: absolute; top: 50%; left: 50%;
          width: 20px; height: 20px;
          border: 2px solid; border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: shockwave 0.6s ease-out infinite;
        }
        .clash-shockwave.delay2 { animation-delay: 0.3s; }
        @keyframes shockwave {
          0%   { width: 10px; height: 10px; opacity: 1; }
          100% { width: 80px; height: 80px; opacity: 0; }
        }
        .resolved { animation: resolved-pop 0.4s ease forwards; }
        .victory-burst {
          font-size: 32px;
          animation: victory-burst 0.5s ease forwards;
        }
        @keyframes victory-burst {
          0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: scale(1.5) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        /* EPIC VICTORY */
        .epic-victory {
          position: relative; z-index: 5;
          display: flex; flex-direction: column; align-items: center;
          padding: 4px 10px 12px;
          animation: victory-appear 0.5s ease forwards;
        }
        @keyframes victory-appear {
          from { opacity: 0; transform: translateY(10px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .victory-kanji {
          font-family: serif; font-size: 28px; color: #8800ff;
          text-shadow: 0 0 20px #8800ff, 0 0 40px #8800ff88;
          animation: kanji-float 1s ease infinite alternate;
          line-height: 1;
        }
        @keyframes kanji-float {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-4px) scale(1.05); }
        }
        .victory-content {
          display: flex; align-items: baseline; gap: 8px; margin-top: 2px;
        }
        .victory-label { font-size: 9px; letter-spacing: 0.15em; opacity: 0.7; }
        .victory-number {
          font-family: 'Share Tech Mono', monospace;
          font-size: 30px; font-weight: bold;
        }

        /* DISPLAY */
        .display-zone {
          background: #020d02; border: 1px solid #0d2b0d; border-radius: 8px;
          padding: 12px 16px 10px; margin-bottom: 14px; text-align: right; min-height: 90px;
          position: relative; overflow: hidden;
        }
        .display-zone::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,255,65,0.03) 0%, transparent 60%);
          pointer-events: none;
        }
        .display-expr { font-size: 11px; color: var(--text-dim); min-height: 16px; margin-bottom: 4px; }
        .display-main { font-size: 44px; font-family: 'Share Tech Mono', monospace; transition: color 0.3s; line-height: 1; }
        .display-unit { font-size: 10px; letter-spacing: 0.15em; margin-top: 4px; }

        /* BUTTONS */
        .buttons-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .calc-btn {
          background: var(--bg-btn); border: 1px solid var(--border); border-radius: 6px;
          color: #b0d4b0; font-family: 'Share Tech Mono', monospace; font-size: 18px;
          padding: 0; height: 60px; cursor: pointer; transition: all 0.1s;
          position: relative; overflow: hidden;
        }
        .calc-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
        }
        .calc-btn:hover { background: #172817; border-color: #2a5e2a; color: #00ff41; }
        .calc-btn:active { transform: scale(0.95); background: #0d200d; }
        .btn-func { background: #0c1c0c; color: #6aaa6a; font-size: 14px; }
        .btn-op { background: #0d1f0d; border-color: #1e3d1e; font-size: 22px; font-weight: bold; }
        .btn-eq {
          background: #1a0030; border-color: #4400aa; color: #cc44ff;
          box-shadow: 0 0 12px rgba(136,0,255,0.3); font-size: 22px;
        }
        .btn-eq:hover { background: #2a0050; box-shadow: 0 0 25px rgba(136,0,255,0.6); color: #ffffff; }
        .btn-num-wide { grid-column: span 2; text-align: left; padding-left: 20px; }

        .calc-footer {
          display: flex; justify-content: space-between;
          margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);
          font-size: 8px; color: var(--text-dim); letter-spacing: 0.08em;
        }

        /* ===== EASTER EGG 67 ===== */
        .easter-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column;
          cursor: pointer;
          transition: opacity 0.8s;
        }
        .easter-overlay.appear {
          animation: easter-bg-in 0.3s ease forwards;
        }
        .easter-overlay.explode {
          background: rgba(0,0,0,0.85);
        }
        .easter-overlay.fade {
          animation: easter-fade-out 0.8s ease forwards;
        }
        @keyframes easter-bg-in {
          0%   { background: rgba(255,255,255,1); }
          30%  { background: rgba(255,200,0,0.9); }
          100% { background: rgba(0,0,0,0.85); }
        }
        @keyframes easter-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; pointer-events: none; }
        }
        .easter-bg-flash {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(255,200,0,0.3) 0%, transparent 70%);
          animation: flash-pulse 0.4s ease infinite alternate;
        }
        @keyframes flash-pulse {
          from { opacity: 0.4; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1.1); }
        }
        .easter-particle {
          position: absolute; pointer-events: none;
        }
        .easter-number {
          position: relative; z-index: 2; text-align: center;
        }
        .easter-number.appear {
          animation: num-slam 0.5s cubic-bezier(0.2, 2, 0.4, 1) forwards;
        }
        .easter-number.explode {
          animation: num-shake 0.1s ease infinite;
        }
        .easter-number.fade {
          animation: num-explode-out 0.6s ease forwards;
        }
        @keyframes num-slam {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.4) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes num-shake {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(-5px, 3px) scale(1.02); }
          75%     { transform: translate(5px, -3px) scale(0.98); }
        }
        @keyframes num-explode-out {
          0%   { transform: scale(1); opacity: 1; filter: blur(0); }
          50%  { transform: scale(2.5); opacity: 0.5; filter: blur(4px); }
          100% { transform: scale(5); opacity: 0; filter: blur(20px); }
        }
        .easter-67 {
          display: block;
          font-family: 'Russo One', sans-serif;
          font-size: clamp(120px, 30vw, 260px);
          line-height: 1;
          background: linear-gradient(135deg, #ff0044 0%, #ff6600 25%, #ffdd00 50%, #00ff88 75%, #00aaff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px rgba(255,200,0,0.8)) drop-shadow(0 0 60px rgba(255,0,100,0.6));
          animation: rainbow-shift 0.5s linear infinite;
        }
        @keyframes rainbow-shift {
          0%   { filter: drop-shadow(0 0 30px #ff0044) drop-shadow(0 0 60px #ff6600); }
          33%  { filter: drop-shadow(0 0 30px #ffdd00) drop-shadow(0 0 60px #00ff88); }
          66%  { filter: drop-shadow(0 0 30px #00aaff) drop-shadow(0 0 60px #cc00ff); }
          100% { filter: drop-shadow(0 0 30px #ff0044) drop-shadow(0 0 60px #ff6600); }
        }
        .easter-sub {
          font-family: 'Russo One', sans-serif;
          font-size: 22px; letter-spacing: 0.2em;
          color: #ffdd00; text-shadow: 0 0 20px #ffdd00;
          margin-top: 8px;
          animation: sub-blink 0.3s ease infinite alternate;
        }
        @keyframes sub-blink {
          from { opacity: 0.7; } to { opacity: 1; }
        }
        .easter-sub2 {
          font-size: 16px; color: #ffffff88; margin-top: 6px;
          letter-spacing: 0.1em;
        }

        /* === 1488 === */
        .bg-red .easter-bg-flash {
          background: radial-gradient(circle at 50% 50%, rgba(255,0,0,0.5) 0%, transparent 70%);
        }
        @keyframes easter-bg-red {
          0%   { background: rgba(255,0,0,1); }
          30%  { background: rgba(180,0,0,0.95); }
          100% { background: rgba(10,0,0,0.92); }
        }
        .bg-red.appear { animation: easter-bg-red 0.3s ease forwards; }
        .bg-red.explode { background: rgba(10,0,0,0.92); }
        .easter-1488 {
          display: block;
          font-family: 'Russo One', sans-serif;
          font-size: clamp(90px, 22vw, 200px);
          line-height: 1;
          color: #ff2200;
          text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 80px #ff3300;
          animation: red-pulse 0.2s ease infinite alternate;
        }
        @keyframes red-pulse {
          from { text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000; }
          to   { text-shadow: 0 0 40px #ff0000, 0 0 80px #ff2200, 0 0 120px #ff0000; }
        }

        /* === 52 === */
        .bg-casino .easter-bg-flash {
          background: radial-gradient(circle at 50% 50%, rgba(255,200,0,0.4) 0%, transparent 70%);
        }
        @keyframes easter-bg-casino {
          0%   { background: rgba(255,200,0,1); }
          30%  { background: rgba(120,0,80,0.95); }
          100% { background: rgba(10,0,30,0.93); }
        }
        .bg-casino.appear { animation: easter-bg-casino 0.3s ease forwards; }
        .bg-casino.explode { background: rgba(10,0,30,0.93); }
        .easter-52 {
          display: block;
          font-family: 'Russo One', sans-serif;
          font-size: clamp(130px, 35vw, 280px);
          line-height: 1;
          background: linear-gradient(135deg, #ffdd00 0%, #ff8800 30%, #ff00cc 60%, #ffdd00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% 200%;
          animation: casino-spin 0.3s linear infinite;
          filter: drop-shadow(0 0 20px #ffdd00) drop-shadow(0 0 40px #ff00cc);
        }
        @keyframes casino-spin {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* === 42 === */
        .bg-space .easter-bg-flash {
          background: radial-gradient(circle at 50% 50%, rgba(0,255,180,0.3) 0%, transparent 70%);
        }
        @keyframes easter-bg-space {
          0%   { background: rgba(0,20,50,1); }
          30%  { background: rgba(0,40,80,0.97); }
          100% { background: rgba(0,5,20,0.95); }
        }
        .bg-space.appear { animation: easter-bg-space 0.3s ease forwards; }
        .bg-space.explode { background: rgba(0,5,20,0.95); }
        .easter-42 {
          display: block;
          font-family: 'Russo One', sans-serif;
          font-size: clamp(140px, 38vw, 300px);
          line-height: 1;
          background: linear-gradient(135deg, #00ff88 0%, #00aaff 40%, #aaffcc 70%, #00ffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px #00ff88) drop-shadow(0 0 60px #00aaff);
          animation: space-glow 0.8s ease infinite alternate;
        }
        @keyframes space-glow {
          from { filter: drop-shadow(0 0 20px #00ff88) drop-shadow(0 0 40px #00aaff); }
          to   { filter: drop-shadow(0 0 50px #00ffcc) drop-shadow(0 0 90px #00ff88); }
        }
      `}</style>
    </div>
  );
}