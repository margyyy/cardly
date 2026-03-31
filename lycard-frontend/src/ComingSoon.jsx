import { useState, useEffect } from "react";

const LAUNCH = new Date("2026-04-01T12:00:00");
const END    = new Date("2026-04-03T12:00:00");

function pad(n) {
  return String(n).padStart(2, "0");
}

function getPhase() {
  const now = Date.now();
  if (now < LAUNCH.getTime()) return "soon";
  if (now < END.getTime())    return "countdown";
  return "open";
}

function getRemaining() {
  const diff = END.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days    = Math.floor(diff / 86400000);
  const hours   = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function ComingSoon({ children }) {
  const [phase, setPhase]       = useState(getPhase);
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase(getPhase());
      setRemaining(getRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (phase === "open") return children;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8">
      <h1
        className="font-head text-4xl tracking-tight"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        Cardly <span style={{ fontFamily: "'Catamaran', sans-serif", fontWeight: 900 }}>"</span>
      </h1>

      {phase === "soon" && (
        <p className="font-head text-xl tracking-widest uppercase text-black/60">
          Coming Soon...
        </p>
      )}

      {phase === "countdown" && (
        <div className="flex gap-4 items-end">
          {[
            { value: remaining.days,    label: "days" },
            { value: remaining.hours,   label: "hours" },
            { value: remaining.minutes, label: "min" },
            { value: remaining.seconds, label: "sec" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className="font-head text-5xl leading-none"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                {pad(value)}
              </span>
              <span className="font-head text-xs uppercase tracking-widest text-black/40">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
