import { useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/retroui/Button";
import { Slider } from "@/components/retroui/Slider";

export default function CardPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const song = state?.song;
  const lines = state?.lines ?? [];

  const [bgUrl, setBgUrl] = useState(null);
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState("white");
  const [lineBar, setLineBar] = useState("none");
  const [lineBarOpacity, setLineBarOpacity] = useState(0.75);
  const [openPanel, setOpenPanel] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, blur: 0 });
  const [confirmedTransform, setConfirmedTransform] = useState(null);
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
    setTransform((t) => ({
      ...t,
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
    const S = 3;
    const W = 320 * S;
    const H = Math.round((320 * 16) / 9) * S;

    await document.fonts.load(`bold ${fontSize * S}px "Archivo Black"`);

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 1. Background
    if (bgUrl && confirmedTransform) {
      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = bgUrl;
      });

      ctx.save();
      if (confirmedTransform.blur > 0)
        ctx.filter = `blur(${confirmedTransform.blur * S}px)`;
      const imgW = W * confirmedTransform.scale;
      const imgH = imgW * (img.naturalHeight / img.naturalWidth);
      const cx = W / 2 + confirmedTransform.x * S;
      const cy = H / 2 + confirmedTransform.y * S;
      ctx.drawImage(img, cx - imgW / 2, cy - imgH / 2, imgW, imgH);
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#1a1025");
      grad.addColorStop(0.6, "#0d0d1a");
      grad.addColorStop(1, "#1a0d2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Quote mark
    ctx.font = `${96 * S}px "Archivo Black", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("\u201C", 32 * S, 110 * S);

    // 3. Lyrics
    const lineH = fontSize * S * 1.5;
    const totalH = lines.length * lineH;
    let y = (H - totalH) / 2 + fontSize * S;
    const x = 40 * S;
    ctx.font = `${fontSize * S}px "Archivo Black", sans-serif`;

    for (const line of lines) {
      if (lineBar !== "none") {
        const metrics = ctx.measureText(line);
        ctx.fillStyle =
          lineBar === "white"
            ? `rgba(255,255,255,${lineBarOpacity})`
            : `rgba(0,0,0,${lineBarOpacity})`;
        ctx.fillRect(
          x - 6 * S,
          y - fontSize * S * 0.85,
          metrics.width + 12 * S,
          lineH * 0.95,
        );
      }
      ctx.fillStyle = textColor === "white" ? "#ffffff" : "#000000";
      ctx.fillText(line, x, y);
      y += lineH;
    }

    // 4. Bottom bar
    const barH = 100 * S;
    const bottomGrad = ctx.createLinearGradient(0, H - barH, 0, H);
    bottomGrad.addColorStop(0, "rgba(0,0,0,0)");
    bottomGrad.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, H - barH, W, barH);

    ctx.font = `bold ${14 * S}px "Archivo Black", sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(song.trackName, 32 * S, H - 44 * S);

    ctx.font = `${12 * S}px "Archivo Black", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(song.artistName, 32 * S, H - 26 * S);

    if (song.albumName) {
      const albumMetrics = ctx.measureText(song.albumName);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(song.albumName, W - 32 * S - albumMetrics.width, H - 26 * S);
    }

    const link = document.createElement("a");
    link.download = `${song.trackName} — ${song.artistName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="w-full max-w-4xl px-6 py-10 flex flex-col gap-6">
      <Button
        variant="default"
        size="sm"
        className="self-start"
        onClick={() => navigate(-1)}
      >
        ← Back
      </Button>

      <div className="flex flex-col items-center gap-4">
        {/* ── Card ── */}
        <div
          ref={cardRef}
          className={`w-full max-w-[320px] aspect-[9/16] shadow-xl relative overflow-hidden ${isResizing ? "cursor-grab active:cursor-grabbing" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* background */}
          {activeBg && bgUrl ? (
            <>
              <img
                src={bgUrl}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none select-none"
                style={{
                  transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})`,
                  top: "50%",
                  left: "50%",
                  width: "100%",
                  transformOrigin: "center",
                  filter:
                    transform.blur > 0
                      ? `blur(${transform.blur}px)`
                      : undefined,
                }}
              />
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #1a1025 0%, #0d0d1a 60%, #1a0d2e 100%)",
              }}
            />
          )}

          {/* resize hint overlay */}
          {isResizing && (
            <div className="absolute inset-0 border-2 border-dashed border-white/30 pointer-events-none z-10" />
          )}

          {/* quote mark */}
          <span
            className="absolute top-6 left-8 text-white/30 select-none pointer-events-none"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: "96px",
              lineHeight: 1,
            }}
          >
            "
          </span>

          {/* lyrics */}
          <div className="absolute inset-0 flex flex-col items-start justify-center px-10 gap-1.5 pointer-events-none">
            {lines.map((line, i) => (
              <p
                key={i}
                className="text-left leading-snug"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: `${fontSize}px`,
                  color: textColor === "white" ? "#ffffff" : "#000000",
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
            ))}
          </div>

          {/* bottom bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-8 py-4 flex items-end justify-between pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
            }}
          >
            <div>
              <p
                className="text-white text-sm leading-tight"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                {song.trackName}
              </p>
              <p
                className="text-white/60 text-xs mt-0.5"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                {song.artistName}
              </p>
            </div>
            {song.albumName && (
              <p
                className="text-white/40 text-xs"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                {song.albumName}
              </p>
            )}
          </div>
        </div>

        {/* ── Resize controls (shown while resizing) ── */}
        {isResizing && (
          <div className="w-full max-w-[320px] flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-head text-xs uppercase tracking-widest">
                Zoom — {Math.round(transform.scale * 100)}%
              </label>
              <Slider
                min={0.5}
                max={5}
                step={0.01}
                value={[transform.scale]}
                onValueChange={([v]) =>
                  setTransform((t) => ({ ...t, scale: v }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-head text-xs uppercase tracking-widest">
                Blur — {transform.blur}px
              </label>
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[transform.blur]}
                onValueChange={([v]) =>
                  setTransform((t) => ({ ...t, blur: v }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={confirmResize}>
                Apply
              </Button>
              <Button variant="outline" size="sm" onClick={cancelResize}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Panels ── */}
        {!isResizing && (
          <div className="w-full max-w-[320px] flex flex-col gap-2">
            {/* Edit Background */}
            <div className="border-2 border-black bg-white">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 font-head text-sm uppercase tracking-widest hover:bg-black/5 transition-colors"
                onClick={() => setOpenPanel((p) => (p === "bg" ? null : "bg"))}
              >
                Edit Background
                <span>{openPanel === "bg" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "bg" && (
                <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
                  <label className="w-full flex items-center justify-center gap-2 border-2 border-black border-dashed px-4 py-2.5 cursor-pointer font-head text-sm shadow-sm hover:shadow-none hover:translate-y-0.5 transition-all bg-white">
                    {bgUrl ? "Change background" : "Upload background"}
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
                      Edit
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
                Edit Text
                <span>{openPanel === "text" ? "▲" : "▼"}</span>
              </button>
              {openPanel === "text" && (
                <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-head text-xs uppercase tracking-widest">
                      Font size — {fontSize}px
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
                      Text color
                    </span>
                    <div className="flex gap-2">
                      {["white", "black"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${textColor === c ? "bg-black text-white shadow-none translate-y-0.5" : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-head text-xs uppercase tracking-widest">
                      Line bar
                    </span>
                    <div className="flex gap-2">
                      {["none", "white", "black"].map((b) => (
                        <button
                          key={b}
                          onClick={() => setLineBar(b)}
                          className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${lineBar === b ? "bg-black text-white shadow-none translate-y-0.5" : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  {lineBar !== "none" && (
                    <div className="flex flex-col gap-1">
                      <label className="font-head text-xs uppercase tracking-widest">
                        Bar opacity — {Math.round(lineBarOpacity * 100)}%
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
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleDownload}
            >
              Download PNG
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
