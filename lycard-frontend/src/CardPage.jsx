import { useRef, useState, useCallback } from "react";
import { domToPng } from "modern-screenshot";

import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/retroui/Button";
import { Slider } from "@/components/retroui/Slider";
import { useLang } from "./LanguageContext.jsx";

const SPACED_PRESETS = [
  { wordSpacing: "0.3em", letterSpacing: "0.01em", lineHeight: "1.4" },
  { wordSpacing: "1.5em", letterSpacing: "0.05em", lineHeight: "1.6" },
  { wordSpacing: "3em",   letterSpacing: "0.15em", lineHeight: "1.8" },
  { wordSpacing: "0.8em", letterSpacing: "0.3em",  lineHeight: "1.5" },
  { wordSpacing: "5em",   letterSpacing: "0em",    lineHeight: "1.3" },
  { wordSpacing: "0.1em", letterSpacing: "0.6em",  lineHeight: "2"   },
  { wordSpacing: "2em",   letterSpacing: "0.1em",  lineHeight: "1.2" },
];
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function parseQueryData(search) {
  try {
    const q = new URLSearchParams(search);
    const d = q.get("d");
    if (d) {
      return JSON.parse(decodeURIComponent(atob(d).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
    }
  } catch (e) {}
  return null;
}

// ── Shared: lyrics lines renderer ────────────────────────────────
const THEME_FONT = {
  cardly:    "'Archivo Black', sans-serif",
  brattify:  "'Arial Narrow', Arial, sans-serif",
};

function LyricLines({ lines, fontSize, textColor, lineBar, lineBarOpacity, spacedText, theme, bratBlur }) {
  const isBrat = theme === "brattify";
  return lines.map((line, i) => (
    <p
      key={i}
      className="leading-snug"
      style={{
        fontFamily: THEME_FONT[theme] ?? THEME_FONT.cardly,
        fontWeight: isBrat ? 500 : undefined,
        filter: isBrat ? `blur(${bratBlur}px)` : undefined,
        textAlign: isBrat ? "justify" : "left",
        textAlignLast: isBrat ? "justify" : undefined,
        fontSize: `${fontSize}px`,
        color: textColor === "white" ? "#ffffff" : "#000000",
        width: "100%",
        ...(spacedText ? {
          wordSpacing: spacedText.wordSpacing,
          letterSpacing: spacedText.letterSpacing,
          lineHeight: spacedText.lineHeight,
          textAlign: "justify",
          textAlignLast: "justify",
        } : {}),
      }}
    >
      {lineBar !== "none" ? (
        <span
          style={{
            backgroundColor:
              lineBar === "white"
                ? `rgba(255,255,255,${lineBarOpacity})`
                : `rgba(0,0,0,${lineBarOpacity})`,
            padding: "2px 6px",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            display: "inline",
          }}
        >
          {line}
        </span>
      ) : (
        line
      )}
    </p>
  ));
}

// ── Shared: background layers ─────────────────────────────────────
function CardBackground({ activeBg, bgUrl, bgColor, transform, isResizing }) {
  return (
    <>
      {activeBg && bgUrl ? (
        <>
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              backgroundImage: `url(${bgUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: `calc(50% + ${transform.x}px) calc(50% + ${transform.y}px)`,
              backgroundSize: `${transform.scale * 100}%`,
              filter: transform.blur > 0 ? `blur(${transform.blur}px)` : undefined,
            }}
          />
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        </>
      ) : bgColor ? (
        <div
          className="absolute inset-0"
          style={{ background: bgColor }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1025 0%, #0d0d1a 60%, #1a0d2e 100%)",
          }}
        />
      )}
      {isResizing && (
        <div className="absolute inset-0 border-2 border-dashed border-white/30 pointer-events-none z-10" />
      )}
    </>
  );
}

export default function CardPage() {
  const { t } = useLang();
  const { state, search } = useLocation();
  const navigate = useNavigate();

  const queryData = parseQueryData(search);
  const song = state?.song || queryData?.song;
  const lines = state?.lines ?? queryData?.lines ?? [];
  const isManual = state?.isManual ?? false;

  const [bgUrl, setBgUrl] = useState(null);
  const [bgColor, setBgColor] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState("white");
  const [lineBar, setLineBar] = useState("none");
  const [lineBarOpacity, setLineBarOpacity] = useState(1);
  const [openPanel, setOpenPanel] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, blur: 0 });
  const [confirmedTransform, setConfirmedTransform] = useState(null);
  const [cardStyle, setCardStyle] = useState("portrait"); // "portrait" | "square"
  const [spacedText, setSpacedText] = useState(null);
  const [theme, setTheme] = useState("cardly");
  const [showQuote, setShowQuote] = useState(true);
  const [showInstaBanner, setShowInstaBanner] = useState(true);
  const [savedImageUrl, setSavedImageUrl] = useState(null);
  const isInstagram = /Instagram/.test(navigator.userAgent);
  const prevTransform = useRef(null);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const cardRef = useRef(null);

  if (!song) {
    navigate("/");
    return null;
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBgUrl(ev.target.result);
      setTransform(confirmedTransform ?? { x: 0, y: 0, scale: 1, blur: 0 });
      prevTransform.current = confirmedTransform;
      setIsResizing(true);
    };
    reader.readAsDataURL(file);
  }

  const onPointerDown = useCallback(
    (e) => {
      if (!isResizing) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      cardRef.current?.setPointerCapture(e.pointerId);
    },
    [isResizing, transform],
  );

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setTransform((tr) => ({
      ...tr,
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  function confirmResize() {
    setConfirmedTransform({ ...transform });
    setIsResizing(false);
  }

  function cancelResize() {
    setIsResizing(false);
    if (prevTransform.current) {
      setTransform(prevTransform.current);
      setConfirmedTransform(prevTransform.current);
    } else {
      setBgUrl(null);
      setTransform({ x: 0, y: 0, scale: 1, blur: 0 });
    }
  }

  const activeBg = isResizing || confirmedTransform;

  async function handleDownload() {
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Open new tab before await to preserve user-gesture context (works on all browsers).
    // On Instagram window.open is blocked, so skip it.
    const newTab = !isInstagram ? window.open("", "_blank") : null;

    // fire-and-forget analytics
    try {
      fetch(`${import.meta.env.VITE_API_URL}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song: song.trackName,
          artist: song.artistName,
          lines: lines.length,
          format: cardStyle,
        }),
      });
    } catch (_) {}

    try {
      await document.fonts.ready;

      const { width, height } = cardRef.current.getBoundingClientRect();
      const fontRules = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter((r) => r instanceof CSSFontFaceRule)
        .map((r) => r.cssText)
        .join("\n");
      const dataUrl = await domToPng(cardRef.current, {
        scale: EXPORT_SCALE,
        width,
        height,
        fixSvgXmlDecode: true,
        drawImageInterval: 300,
        onCreateForeignObjectSvg: (svg) => {
          if (fontRules) {
            const style = svg.querySelector("style");
            if (style) style.textContent += "\n" + fontRules;
          }
        },
      });

      const fileName = `${song.trackName} — ${song.artistName}.png`;
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const blobUrl = URL.createObjectURL(blob);

      if (isInstagram) {
        // Instagram blocks window.open — show image inline for long-press save
        setSavedImageUrl(blobUrl);
      } else if (newTab) {
        if (isMobile) {
          // On mobile: load an HTML wrapper with the image so user can long-press to save
          const html =
            `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">` +
            `<style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100dvh}` +
            `img{max-width:100%;max-height:100dvh;object-fit:contain}</style></head>` +
            `<body><img src="${blobUrl}"></body></html>`;
          const htmlBlob = new Blob([html], { type: "text/html" });
          newTab.location.href = URL.createObjectURL(htmlBlob);
        } else {
          newTab.location.href = blobUrl;
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      } else {
        // Fallback
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      }
    } catch (err) {
      if (newTab) newTab.close();
      alert("Errore: " + err.message);
    }
  }

  const isPortrait = cardStyle === "portrait";
  const isFourFive = cardStyle === "fourfive";
  const isBrat = theme === "brattify";
  const bratStyle = isBrat ? { backgroundColor: "#8ACF00", borderColor: "#8ACF00", color: "#000000" } : {};
  const EXPORT_SCALE = 3;
  // blur is pre-divided by scale so domToPng at 3x renders it as the intended 0.8px
  const bratBlur = 0.8 / EXPORT_SCALE;

  return (
    <>
    <div className="w-full max-w-4xl px-6 py-10 flex flex-col gap-6">
      <Button
        variant="default"
        size="sm"
        className="self-start"
        style={bratStyle}
        onClick={() => navigate(-1)}
      >
        {t.back}
      </Button>

      {isInstagram && showInstaBanner && (
        <div className="flex items-start gap-3 border-2 border-border bg-card px-4 py-3 text-sm font-sans">
          <span className="flex-1">{t.instaBanner}</span>
          <button
            className="font-head text-foreground/50 hover:text-foreground leading-none mt-0.5"
            onClick={() => setShowInstaBanner(false)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-8">
        {/* ── Card ── */}
        <div
          ref={cardRef}
          className={`shadow-xl relative overflow-hidden ${
            isPortrait
              ? "w-full max-w-[300px] aspect-[9/16]"
              : isFourFive
              ? "w-full max-w-[340px] aspect-[4/5]"
              : "w-full max-w-[340px] aspect-square"
          } ${isResizing ? "cursor-grab active:cursor-grabbing" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <CardBackground
            activeBg={activeBg}
            bgUrl={bgUrl}
            bgColor={bgColor}
            transform={transform}
            isResizing={isResizing}
          />

          {/* quote mark top-left */}
          {showQuote && (
            <span
              className="absolute top-5 left-6 text-white/30 select-none pointer-events-none"
              style={{
                fontFamily: "'Catamaran', sans-serif",
                fontWeight: 900,
                fontSize: isPortrait ? "80px" : "64px",
                lineHeight: 1,
              }}
            >
              "
            </span>
          )}

          {/* lyrics — centered in safe zone (below quote, above bottom bar) */}
          <div
            className="absolute left-0 right-0 flex flex-col items-start justify-center pointer-events-none gap-1.5 overflow-hidden"
            style={{
              top: isPortrait ? "64px" : "54px",
              bottom: isPortrait ? "50px" : "46px",
              padding: isPortrait ? "0 2.5rem" : "0 2rem",
            }}
          >
            <LyricLines
              lines={lines}
              fontSize={fontSize}
              textColor={textColor}
              lineBar={lineBar}
              lineBarOpacity={lineBarOpacity}
              spacedText={spacedText}
              theme={theme}
              bratBlur={bratBlur}
            />
          </div>

          {/* bottom bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 py-4 pointer-events-none"
            style={{
              background: bgColor && !activeBg
                ? "transparent"
                : "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
            }}
          >
            <p
              className="text-white leading-tight"
              style={{
                fontFamily: THEME_FONT[theme],
                fontSize: isPortrait ? "13px" : "12px",
                filter: isBrat ? `blur(${bratBlur * 0.75}px)` : undefined,
              }}
            >
              {song.trackName}
            </p>
            <p
              className="text-white/60 mt-0.5"
              style={{
                fontFamily: THEME_FONT[theme],
                fontSize: isPortrait ? "11px" : "10px",
                filter: isBrat ? `blur(${bratBlur * 0.75}px)` : undefined,
              }}
            >
              {song.artistName}
            </p>
            {isPortrait && song.albumName && (
              <p
                className="text-white/40 text-xs absolute bottom-4 right-6"
                style={{ fontFamily: THEME_FONT[theme] }}
              >
                {song.albumName}
              </p>
            )}
          </div>
        </div>

        {/* ── Resize controls ── */}
        {isResizing && (
          <div className="w-full max-w-[340px] flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-head text-xs uppercase tracking-widest">
                {t.zoom} — {Math.round(transform.scale * 100)}%
              </label>
              <Slider
                min={0.5}
                max={5}
                step={0.01}
                value={[transform.scale]}
                onValueChange={([v]) =>
                  setTransform((tr) => ({ ...tr, scale: v }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-head text-xs uppercase tracking-widest">
                {t.blur} — {transform.blur}px
              </label>
              <Slider
                min={0}
                max={10}
                step={0.1}
                value={[transform.blur]}
                onValueChange={([v]) =>
                  setTransform((tr) => ({ ...tr, blur: v }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={confirmResize}>
                {t.apply}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelResize}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}

        {/* ── Panels ── */}
        {!isResizing && (
          <div className="w-full max-w-[340px] flex flex-col gap-2">

            {/* Change Style */}
            <div className="border-2 border-border bg-card">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-foreground/5 transition-colors"
                onClick={() =>
                  setOpenPanel((p) => (p === "style" ? null : "style"))
                }
              >
                {t.changeStyle}
                <span>{openPanel === "style" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "style" && (
                <div className="flex gap-2 px-4 pb-4 pt-1">
                  {["portrait", "fourfive", "square"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setCardStyle(s)}
                      className={`flex-1 py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest transition-all ${
                        cardStyle === s
                          ? "bg-foreground text-background shadow-none translate-y-0.5"
                          : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                      }`}
                    >
                      {s === "portrait" ? t.stylePortrait : s === "fourfive" ? t.styleFourFive : t.styleSquare}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Style (cardly / brattify) */}
            <div className="border-2 border-border bg-card">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-foreground/5 transition-colors"
                onClick={() => setOpenPanel((p) => (p === "theme" ? null : "theme"))}
              >
                {t.editStyle}
                <span>{openPanel === "theme" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "theme" && (
                <div className="flex gap-2 px-4 pb-4 pt-1">
                  <button
                    onClick={() => setTheme("cardly")}
                    style={{ fontFamily: THEME_FONT["cardly"] }}
                    className={`flex-1 py-1.5 border-2 border-border text-sm transition-all ${
                      theme === "cardly"
                        ? "bg-foreground text-background shadow-none translate-y-0.5"
                        : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                    }`}
                  >
                    cardly
                  </button>
                  <button
                    disabled
                    style={{ fontFamily: THEME_FONT["brattify"] }}
                    className="flex-1 py-1.5 border-2 border-border text-sm bg-card text-foreground/30 cursor-not-allowed select-none"
                  >
                    brattify — {t.comingSoon}
                  </button>
                </div>
              )}
            </div>

            {/* Edit Background */}
            <div className="border-2 border-border bg-card">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-foreground/5 transition-colors"
                onClick={() => setOpenPanel((p) => (p === "bg" ? null : "bg"))}
              >
                {t.editBackground}
                <span>{openPanel === "bg" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "bg" && (
                <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
                  <label className="w-full flex items-center justify-center gap-2 border-2 border-border border-dashed px-4 py-2.5 cursor-pointer font-head text-sm shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all bg-card text-foreground">
                    {bgUrl ? t.changeBackground : t.uploadBackground}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                  {confirmedTransform && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setTransform({ ...confirmedTransform });
                        setIsResizing(true);
                      }}
                    >
                      {t.edit}
                    </Button>
                  )}
                  <label className="w-full flex items-center justify-between gap-3 border-2 border-border px-4 py-2.5 cursor-pointer font-head text-sm bg-card text-foreground">
                    <span>{t.bgColor}</span>
                    <input
                      type="color"
                      value={bgColor ?? "#1a1025"}
                      className="w-8 h-8 cursor-pointer border-0 bg-transparent p-0"
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        setBgUrl(null);
                        setConfirmedTransform(null);
                        setIsResizing(false);
                      }}
                    />
                  </label>
                  {bgColor && (
                    <button
                      className="w-full py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all"
                      onClick={() => setBgColor(null)}
                    >
                      {t.cancel}
                    </button>
                  )}
                  {isManual && (
                    <button
                      className={`w-full py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest transition-all ${
                        !showQuote
                          ? "bg-foreground text-background shadow-none translate-y-0.5"
                          : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                      }`}
                      onClick={() => setShowQuote((q) => !q)}
                    >
                      {t.removeWatermark}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Edit Text */}
            <div className="border-2 border-border bg-card">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-foreground/5 transition-colors"
                onClick={() =>
                  setOpenPanel((p) => (p === "text" ? null : "text"))
                }
              >
                {t.editText}
                <span>{openPanel === "text" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "text" && (
                <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-head text-xs uppercase tracking-widest">
                      {t.fontSize} — {fontSize}px
                    </label>
                    <Slider
                      min={8}
                      max={28}
                      step={1}
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-head text-xs uppercase tracking-widest">
                      {t.textColor}
                    </span>
                    <div className="flex gap-2">
                      {["white", "black"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`flex-1 py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest transition-all ${
                            textColor === c
                              ? "bg-foreground text-background shadow-none translate-y-0.5"
                              : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                          }`}
                        >
                          {c === "white" ? t.colorWhite : t.colorBlack}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={`flex flex-col gap-1.5 ${spacedText ? "opacity-30 pointer-events-none select-none" : ""}`}>
                    <span className="font-head text-xs uppercase tracking-widest">
                      {t.lineBar}
                    </span>
                    <div className="flex gap-2">
                      {["none", "white", "black"].map((b) => (
                        <button
                          key={b}
                          onClick={() => setLineBar(b)}
                          className={`flex-1 py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest transition-all ${
                            lineBar === b
                              ? "bg-foreground text-background shadow-none translate-y-0.5"
                              : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                          }`}
                        >
                          {b === "none"
                            ? t.lineBarNone
                            : b === "white"
                            ? t.colorWhite
                            : t.colorBlack}
                        </button>
                      ))}
                    </div>
                    {lineBar !== "none" && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="font-head text-xs uppercase tracking-widest">
                          {t.barOpacity} — {Math.round(lineBarOpacity * 100)}%
                        </label>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={[lineBarOpacity]}
                          onValueChange={([v]) => setLineBarOpacity(v)}
                        />
                      </div>
                    )}
                  </div>
                  <div className={`flex flex-col gap-1.5 ${isBrat ? "opacity-30 pointer-events-none select-none" : ""}`}>
                    <span className="font-head text-xs uppercase tracking-widest flex items-center gap-2">
                      {t.spacedText}
                      {spacedText && <span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" />}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSpacedText((s) => { if (!s) setLineBar("none"); return s ? null : SPACED_PRESETS[0]; })}
                        className={`flex-1 py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest transition-all ${
                          spacedText
                            ? "bg-foreground text-background shadow-none translate-y-0.5"
                            : "bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5"
                        }`}
                      >
                        {spacedText ? t.deactivate : t.activate}
                      </button>
                      <button
                        onClick={() => { setLineBar("none"); setSpacedText(randomFrom(SPACED_PRESETS)); }}
                        className="flex-1 py-1.5 border-2 border-border font-head text-xs uppercase tracking-widest bg-card text-foreground shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all"
                      >
                        {t.randomize}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="default"
              size="sm"
              className="w-full"
              style={bratStyle}
              onClick={handleDownload}
            >
              {t.downloadPng}
            </Button>
          </div>
        )}
      </div>
    </div>

    {savedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 px-6"
          onClick={() => setSavedImageUrl(null)}
        >
          <p className="text-white text-sm font-head uppercase tracking-widest text-center">
            {t.instaOverlayHint}
          </p>
          <img
            src={savedImageUrl}
            alt="card"
            className="max-w-full max-h-[70vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="text-white/60 font-head text-xs uppercase tracking-widest border border-white/30 px-4 py-2"
            onClick={() => setSavedImageUrl(null)}
          >
            {t.instaOverlayClose}
          </button>
        </div>
      )}
    </>
  );
}
