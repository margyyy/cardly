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
      return JSON.parse(decodeURIComponent(escape(atob(d))));
    }
  } catch (e) {}
  return null;
}

// ── Shared: lyrics lines renderer ────────────────────────────────
function LyricLines({ lines, fontSize, textColor, lineBar, lineBarOpacity, spacedText }) {
  return lines.map((line, i) => (
    <p
      key={i}
      className="text-left leading-snug"
      style={{
        fontFamily: "'Archivo Black', sans-serif",
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
function CardBackground({ activeBg, bgUrl, transform, isResizing }) {
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

  const [bgUrl, setBgUrl] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState("white");
  const [lineBar, setLineBar] = useState("none");
  const [lineBarOpacity, setLineBarOpacity] = useState(0.75);
  const [openPanel, setOpenPanel] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, blur: 0 });
  const [confirmedTransform, setConfirmedTransform] = useState(null);
  const [cardStyle, setCardStyle] = useState("portrait"); // "portrait" | "square"
  const [spacedText, setSpacedText] = useState(null);
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
    try {
      await document.fonts.ready;
      const { width, height } = cardRef.current.getBoundingClientRect();
      const fontRule = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .find((r) => r instanceof CSSFontFaceRule);
      const dataUrl = await domToPng(cardRef.current, {
        scale: 3,
        width,
        height,
        fixSvgXmlDecode: true,
        drawImageInterval: 300,
        onCreateForeignObjectSvg: (svg) => {
          if (fontRule) {
            const style = svg.querySelector("style");
            if (style) style.textContent += "\n" + fontRule.cssText;
          }
        },
      });

      const fileName = `${song.trackName} — ${song.artistName}.png`;
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      alert("Errore: " + err.message);
    }
  }

  const isPortrait = cardStyle === "portrait";

  return (
    <div className="w-full max-w-4xl px-6 py-10 flex flex-col gap-6">
      <Button
        variant="default"
        size="sm"
        className="self-start"
        onClick={() => navigate(-1)}
      >
        {t.back}
      </Button>

      <div className="flex flex-col items-center gap-8">
        {/* ── Card ── */}
        <div
          ref={cardRef}
          className={`shadow-xl relative overflow-hidden ${
            isPortrait
              ? "w-full max-w-[300px] aspect-[9/16]"
              : "w-full max-w-[340px] aspect-square"
          } ${isResizing ? "cursor-grab active:cursor-grabbing" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <CardBackground
            activeBg={activeBg}
            bgUrl={bgUrl}
            transform={transform}
            isResizing={isResizing}
          />

          {/* quote mark top-left */}
          <span
            className="absolute top-5 left-6 text-white/30 select-none pointer-events-none"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: isPortrait ? "80px" : "64px",
              lineHeight: 1,
            }}
          >
            "
          </span>

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
            />
          </div>

          {/* bottom bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 py-4 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
            }}
          >
            <p
              className="text-white leading-tight"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: isPortrait ? "13px" : "12px",
              }}
            >
              {song.trackName}
            </p>
            <p
              className="text-white/60 mt-0.5"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: isPortrait ? "11px" : "10px",
              }}
            >
              {song.artistName}
            </p>
            {isPortrait && song.albumName && (
              <p
                className="text-white/40 text-xs absolute bottom-4 right-6"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
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
            <div className="border-2 border-black bg-white">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-black/5 transition-colors"
                onClick={() =>
                  setOpenPanel((p) => (p === "style" ? null : "style"))
                }
              >
                {t.changeStyle}
                <span>{openPanel === "style" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "style" && (
                <div className="flex gap-2 px-4 pb-4 pt-1">
                  {["portrait", "square"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setCardStyle(s)}
                      className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${
                        cardStyle === s
                          ? "bg-black text-white shadow-none translate-y-0.5"
                          : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
                      }`}
                    >
                      {s === "portrait" ? t.stylePortrait : t.styleSquare}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Background */}
            <div className="border-2 border-black bg-white">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-black/5 transition-colors"
                onClick={() => setOpenPanel((p) => (p === "bg" ? null : "bg"))}
              >
                {t.editBackground}
                <span>{openPanel === "bg" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "bg" && (
                <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
                  <label className="w-full flex items-center justify-center gap-2 border-2 border-black border-dashed px-4 py-2.5 cursor-pointer font-head text-sm shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all bg-white">
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
                </div>
              )}
            </div>

            {/* Edit Text */}
            <div className="border-2 border-black bg-white">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-black/5 transition-colors"
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
                          className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${
                            textColor === c
                              ? "bg-black text-white shadow-none translate-y-0.5"
                              : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
                          }`}
                        >
                          {c === "white" ? t.colorWhite : t.colorBlack}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-head text-xs uppercase tracking-widest">
                      {t.lineBar}
                    </span>
                    <div className="flex gap-2">
                      {["none", "white", "black"].map((b) => (
                        <button
                          key={b}
                          onClick={() => setLineBar(b)}
                          className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${
                            lineBar === b
                              ? "bg-black text-white shadow-none translate-y-0.5"
                              : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
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
                  </div>
                  {lineBar !== "none" && (
                    <div className="flex flex-col gap-1">
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
                  <div className="flex flex-col gap-1.5">
                    <span className="font-head text-xs uppercase tracking-widest flex items-center gap-2">
                      {t.spacedText}
                      {spacedText && <span className="w-1.5 h-1.5 rounded-full bg-black inline-block" />}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSpacedText((s) => (s ? null : SPACED_PRESETS[0]))}
                        className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${
                          spacedText
                            ? "bg-black text-white shadow-none translate-y-0.5"
                            : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
                        }`}
                      >
                        {spacedText ? t.deactivate : t.activate}
                      </button>
                      <button
                        onClick={() => setSpacedText(randomFrom(SPACED_PRESETS))}
                        className="flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all"
                      >
                        {t.randomize}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleDownload}
            >
              {t.downloadPng}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
