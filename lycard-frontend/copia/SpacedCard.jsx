import { useState } from "react";

const presets = [
  { wordSpacing: "0.3em", letterSpacing: "0.01em", lineHeight: "1.4" },
  { wordSpacing: "1.5em", letterSpacing: "0.05em", lineHeight: "1.6" },
  { wordSpacing: "3em", letterSpacing: "0.15em", lineHeight: "1.8" },
  { wordSpacing: "0.8em", letterSpacing: "0.3em", lineHeight: "1.5" },
  { wordSpacing: "5em", letterSpacing: "0em", lineHeight: "1.3" },
  { wordSpacing: "0.1em", letterSpacing: "0.6em", lineHeight: "2" },
  { wordSpacing: "2em", letterSpacing: "0.1em", lineHeight: "1.2" },
];

const bgColors = ["#d4d4a0", "#e8d5b7", "#c9d8c5", "#d5c9e2", "#f0e0d0", "#cfe0e8"];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function SpacedCard() {
  const [inputText, setInputText] = useState("la mia routine quotidiana: dormo, piango e vado a spasso");
  const [displayText, setDisplayText] = useState("la mia routine quotidiana: dormo, piango e vado a spasso");
  const [style, setStyle] = useState(presets[0]);
  const [bg, setBg] = useState(bgColors[0]);
  const [fontSize, setFontSize] = useState(24);

  const randomize = () => {
    setStyle(randomFrom(presets));
    setBg(randomFrom(bgColors));
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "sans-serif",
      gap: "1.5rem",
    }}>

      {/* Card quadrata */}
      <div style={{
        background: bg,
        width: "360px",
        height: "360px",
        borderRadius: "6px",
        padding: "2rem",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.4s ease",
        overflow: "hidden",
      }}>
        <p style={{
          margin: 0,
          color: "#1a1a1a",
          textAlign: "justify",
          textAlignLast: "justify",
          fontWeight: "600",
          width: "100%",
          fontSize: `${fontSize}px`,
          transition: "all 0.3s ease",
          ...style,
        }}>
          {displayText}
        </p>
      </div>

      {/* Slider font size */}
      <div style={{ width: "360px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "#888", fontSize: "0.8rem" }}>Font size</span>
          <span style={{ color: "#d4d4a0", fontSize: "0.8rem", fontWeight: "600" }}>{fontSize}px</span>
        </div>
        <input
          type="range"
          min={10}
          max={48}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#d4d4a0", cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555", fontSize: "0.72rem" }}>10px</span>
          <span style={{ color: "#555", fontSize: "0.72rem" }}>48px</span>
        </div>
      </div>

      {/* Textarea + bottoni */}
      <div style={{ width: "360px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "none",
            background: "#2a2a2a",
            color: "#fff",
            fontSize: "0.95rem",
            resize: "vertical",
            minHeight: "72px",
            boxSizing: "border-box",
            outline: "none",
          }}
          placeholder="Scrivi il tuo testo..."
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setDisplayText(inputText)}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            Aggiorna
          </button>
          <button
            onClick={randomize}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: bg,
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "700",
              cursor: "pointer",
              color: "#1a1a1a",
              transition: "background 0.4s ease",
            }}
          >
            🎲 Randomize
          </button>
        </div>
      </div>

      {/* Stile attivo */}
      <div style={{ width: "360px", color: "#555", fontSize: "0.75rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {Object.entries(style).map(([k, v]) => (
          <span key={k}><span style={{ color: "#d4d4a0" }}>{k}:</span> {v}</span>
        ))}
      </div>

    </div>
  );
}
