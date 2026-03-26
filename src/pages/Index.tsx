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

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

function BattleArena({
  state,
  fighter1,
  fighter2,
  operator,
  result,
  sparks,
  color,
}: {
  state: BattleState;
  fighter1: string;
  fighter2: string;
  operator: string;
  result: string;
  sparks: Spark[];
  color: string;
}) {
  if (state === "idle") return null;

  return (
    <div className="battle-arena">
      <div className="arena-title">⚔ БИТВА ⚔</div>
      <div className="arena-field">
        <div className={`fighter fighter-left ${state === "fighting" ? "attack-right" : "victory-fade"}`} style={{ color }}>
          <div className="fighter-num">{fighter1}</div>
          <div className="fighter-label">АТАКУЕТ</div>
        </div>

        <div className={`arena-center ${state === "fighting" ? "clash-pulse" : ""}`}>
          {state === "fighting" ? (
            <span className="clash-op" style={{ color }}>{operator}</span>
          ) : (
            <span className="victory-sign" style={{ color }}>✓</span>
          )}
        </div>

        <div className={`fighter fighter-right ${state === "fighting" ? "attack-left" : "victory-fade"}`} style={{ color }}>
          <div className="fighter-num">{fighter2}</div>
          <div className="fighter-label">ЗАЩИЩАЕТСЯ</div>
        </div>

        {sparks.map((s) => (
          <div
            key={s.id}
            className="spark"
            style={{
              left: `calc(50% + ${s.x}px)`,
              top: `calc(50% + ${s.y}px)`,
              backgroundColor: s.color,
              opacity: s.life,
              transform: `scale(${s.life})`,
            }}
          />
        ))}
      </div>

      {state === "victory" && (
        <div className="victory-result" style={{ color, textShadow: `0 0 20px ${color}` }}>
          <span className="victory-label">ПОБЕДИТЕЛЬ:</span>
          <span className="victory-num">{result}</span>
        </div>
      )}
    </div>
  );
}

function RadiationBar({ value }: { value: number }) {
  const abs = Math.min(Math.abs(value), 999);
  const pct = Math.min((abs / 999) * 100, 100);
  const level = getRadiationLevel(value);

  return (
    <div className="radiation-bar-wrap">
      <div className="radiation-bar-label">
        <span className="bar-title">УРОВЕНЬ ИЗЛУЧЕНИЯ</span>
        <span className="bar-unit" style={{ color: level.color }}>{level.label}</span>
      </div>
      <div className="radiation-bar-track">
        {Array.from({ length: 20 }).map((_, i) => {
          const segPct = (i + 1) * 5;
          const active = segPct <= pct;
          const segColor =
            segPct <= 50 ? "#00ff41" :
            segPct <= 75 ? "#aaff00" :
            segPct <= 90 ? "#ffaa00" : "#ff2200";
          return (
            <div
              key={i}
              className="radiation-seg"
              style={{
                backgroundColor: active ? segColor : "rgba(255,255,255,0.05)",
                boxShadow: active ? `0 0 6px ${segColor}` : "none",
              }}
            />
          );
        })}
      </div>
      <div className="radiation-scale">
        <span>0</span><span>250</span><span>500</span><span>750</span><span>999</span>
      </div>
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

export default function Index() {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState("");
  const [pulse, setPulse] = useState(false);
  const [shake, setShake] = useState(false);
  const [tick, setTick] = useState(0);

  const [battleState, setBattleState] = useState<BattleState>("idle");
  const [battleF1, setBattleF1] = useState("");
  const [battleF2, setBattleF2] = useState("");
  const [battleOp, setBattleOp] = useState("");
  const [battleResult, setBattleResult] = useState("");
  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparkIdRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

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
    if (level.danger >= 2) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [display]);

  const spawnSparks = (color: string) => {
    const newSparks: Spark[] = Array.from({ length: 18 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return {
        id: ++sparkIdRef.current,
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: Math.random() > 0.5 ? color : "#ffffff",
      };
    });
    setSparks(newSparks);

    let frame = 0;
    const animate = () => {
      frame++;
      setSparks((prev) =>
        prev
          .map((s) => ({ ...s, x: s.x + s.vx, y: s.y + s.vy, vy: s.vy + 0.3, life: s.life - 0.035 }))
          .filter((s) => s.life > 0)
      );
      if (frame < 40) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
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
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay("0."); setWaitingForOperand(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const handleOperator = (op: Operator) => {
    const value = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, value, operator);
      setDisplay(String(result));
      setExpression(`${result} ${op}`);
      setPrevValue(result);
    } else {
      setPrevValue(value);
      setExpression(`${display} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (prevValue === null || !operator) return;
    const value = parseFloat(display);
    const result = calculate(prevValue, value, operator);
    const rounded = Math.round(result * 1e10) / 1e10;

    setBattleF1(String(prevValue));
    setBattleF2(String(value));
    setBattleOp(operator);
    setBattleResult(String(rounded));
    setBattleState("fighting");
    spawnSparks(level.color);

    setTimeout(() => {
      spawnSparks(level.color);
      setBattleState("victory");
      setDisplay(String(rounded));
      setExpression(`${prevValue} ${operator} ${value} =`);
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }, 1400);

    setTimeout(() => {
      setBattleState("idle");
      setSparks([]);
    }, 3200);
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression("");
    setBattleState("idle");
    setSparks([]);
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
      <div className="scanlines" />
      <div className={`calc-body ${shake ? "shake" : ""}`}>
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

        <RadiationBar value={numValue} />

        <BattleArena
          state={battleState}
          fighter1={battleF1}
          fighter2={battleF2}
          operator={battleOp}
          result={battleResult}
          sparks={sparks}
          color={level.color}
        />

        {battleState === "idle" && (
          <div className="display-zone">
            <div className="display-expr">{expression || "\u00A0"}</div>
            <div
              className="display-main"
              style={{ color: level.color, textShadow: `0 0 20px ${level.color}66, 0 0 40px ${level.color}33` }}
            >
              {formatDisplay(display)}
            </div>
            <div className="display-unit" style={{ color: level.color + "99" }}>
              мкЗв/ч
            </div>
          </div>
        )}

        <div className="buttons-grid">
          {buttons.map((btn, i) => (
            <button
              key={i}
              className={`calc-btn btn-${btn.type}`}
              onClick={btn.action}
              style={btn.type === "op" ? { color: level.color, borderColor: level.color + "55" } : undefined}
            >
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
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .calc-root {
          min-height: 100vh;
          background: var(--bg-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Share Tech Mono', monospace;
          position: relative;
          overflow: hidden;
        }

        .calc-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 60% at 50% 50%, #0a2a0a 0%, #020802 100%);
          z-index: 0;
        }

        .scanlines {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.15) 3px,
            rgba(0,0,0,0.15) 4px
          );
          pointer-events: none;
          z-index: 100;
        }

        .calc-body {
          position: relative;
          z-index: 1;
          width: 340px;
          background: var(--bg-panel);
          border: 1px solid #1e3d1e;
          border-radius: 12px;
          padding: 20px 16px 16px;
          box-shadow:
            0 0 40px rgba(0,255,65,0.1),
            0 0 80px rgba(0,255,65,0.05),
            inset 0 1px 0 rgba(0,255,65,0.15);
        }

        .shake { animation: shake 0.4s ease; }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-0.5deg); }
          40% { transform: translateX(4px) rotate(0.5deg); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .calc-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .rad-icon-wrap {
          padding: 6px;
          border-radius: 50%;
          border: 1px solid var(--border);
        }

        .rad-icon-wrap.danger-0 { color: #00ff41; border-color: #00ff4133; }
        .rad-icon-wrap.danger-1 { color: #aaff00; border-color: #aaff0033; }
        .rad-icon-wrap.danger-2 { color: #ffaa00; border-color: #ffaa0033; animation: blink 1s infinite; }
        .rad-icon-wrap.danger-3 { color: #ff2200; border-color: #ff220033; animation: blink 0.5s infinite; }

        @keyframes blink {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .header-text { flex: 1; }

        .device-name {
          font-family: 'Russo One', sans-serif;
          font-size: 18px;
          color: var(--green);
          letter-spacing: 0.15em;
          text-shadow: 0 0 10px rgba(0,255,65,0.5);
        }

        .device-model {
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        .status-dot-wrap { text-align: center; }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin: 0 auto 3px;
          transition: opacity 0.3s;
        }

        .status-dot.active { box-shadow: 0 0 8px currentColor; }

        .status-dot-label {
          font-size: 8px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
        }

        .radiation-bar-wrap {
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 12px;
        }

        .radiation-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }

        .bar-title { color: var(--text-dim); }

        .radiation-bar-track {
          display: flex;
          gap: 2px;
          height: 8px;
        }

        .radiation-seg {
          flex: 1;
          border-radius: 1px;
          transition: background-color 0.3s, box-shadow 0.3s;
        }

        .radiation-scale {
          display: flex;
          justify-content: space-between;
          font-size: 7px;
          color: var(--text-dim);
          margin-top: 4px;
        }

        /* ===== BATTLE ARENA ===== */
        .battle-arena {
          background: #020d02;
          border: 1px solid #0d2b0d;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 12px;
          min-height: 90px;
          overflow: hidden;
        }

        .arena-title {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: var(--text-dim);
          text-align: center;
          margin-bottom: 8px;
        }

        .arena-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          height: 56px;
        }

        .fighter {
          text-align: center;
          width: 90px;
          transition: transform 0.15s;
        }

        .fighter-num {
          font-family: 'Share Tech Mono', monospace;
          font-size: 22px;
          line-height: 1;
        }

        .fighter-label {
          font-size: 7px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          margin-top: 3px;
        }

        .attack-right {
          animation: attack-r 0.35s ease-in-out infinite alternate;
        }

        .attack-left {
          animation: attack-l 0.35s ease-in-out infinite alternate;
        }

        @keyframes attack-r {
          from { transform: translateX(0) scale(1); }
          to   { transform: translateX(18px) scale(1.1); }
        }

        @keyframes attack-l {
          from { transform: translateX(0) scale(1); }
          to   { transform: translateX(-18px) scale(1.1); }
        }

        .victory-fade {
          animation: victory-pop 0.5s ease forwards;
        }

        @keyframes victory-pop {
          0%   { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0.3; }
        }

        .arena-center {
          font-size: 28px;
          width: 40px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .clash-pulse {
          animation: clash-p 0.2s ease infinite alternate;
        }

        @keyframes clash-p {
          from { transform: scale(1); }
          to   { transform: scale(1.4); }
        }

        .clash-op { font-weight: bold; }

        .victory-sign {
          font-size: 26px;
          animation: spin-in 0.4s ease forwards;
        }

        @keyframes spin-in {
          from { transform: rotate(-180deg) scale(0); opacity: 0; }
          to   { transform: rotate(0deg) scale(1); opacity: 1; }
        }

        .spark {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          pointer-events: none;
          transition: none;
        }

        .victory-result {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 6px;
          animation: result-appear 0.4s ease forwards;
        }

        @keyframes result-appear {
          from { opacity: 0; transform: translateY(8px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .victory-label {
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
        }

        .victory-num {
          font-family: 'Share Tech Mono', monospace;
          font-size: 26px;
          font-weight: bold;
        }

        /* ===== DISPLAY ===== */
        .display-zone {
          background: #020d02;
          border: 1px solid #0d2b0d;
          border-radius: 8px;
          padding: 12px 16px 10px;
          margin-bottom: 14px;
          text-align: right;
          min-height: 90px;
          position: relative;
          overflow: hidden;
        }

        .display-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,255,65,0.03) 0%, transparent 60%);
          pointer-events: none;
        }

        .display-expr {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
          min-height: 16px;
          margin-bottom: 4px;
        }

        .display-main {
          font-size: 44px;
          font-family: 'Share Tech Mono', monospace;
          transition: color 0.3s, text-shadow 0.3s;
          line-height: 1;
        }

        .display-unit {
          font-size: 10px;
          letter-spacing: 0.15em;
          margin-top: 4px;
        }

        /* ===== BUTTONS ===== */
        .buttons-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .calc-btn {
          background: var(--bg-btn);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: #b0d4b0;
          font-family: 'Share Tech Mono', monospace;
          font-size: 18px;
          padding: 0;
          height: 60px;
          cursor: pointer;
          transition: all 0.1s;
          position: relative;
          overflow: hidden;
        }

        .calc-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
        }

        .calc-btn:hover {
          background: #172817;
          border-color: #2a5e2a;
          color: #00ff41;
        }

        .calc-btn:active { transform: scale(0.95); background: #0d200d; }

        .btn-func { background: #0c1c0c; color: #6aaa6a; font-size: 14px; }

        .btn-op {
          background: #0d1f0d;
          border-color: #1e3d1e;
          font-size: 22px;
          font-weight: bold;
          transition: all 0.1s, color 0.3s, border-color 0.3s;
        }

        .btn-eq {
          background: #003300;
          border-color: #005500;
          color: #00ff41;
          box-shadow: 0 0 12px rgba(0,255,65,0.15);
          font-size: 22px;
        }

        .btn-eq:hover { background: #004400; box-shadow: 0 0 20px rgba(0,255,65,0.3); }

        .btn-num-wide { grid-column: span 2; text-align: left; padding-left: 20px; }

        .calc-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          font-size: 8px;
          color: var(--text-dim);
          letter-spacing: 0.08em;
        }
      `}</style>
    </div>
  );
}
