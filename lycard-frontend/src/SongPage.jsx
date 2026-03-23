import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SongPage.css";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";

export default function SongPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const song = state?.song;

  const [selectedLines, setSelectedLines] = useState(new Set());

  if (!song) {
    navigate("/");
    return null;
  }

  const lines = song.plainLyrics ? song.plainLyrics.split("\n") : [];

  function toggleLine(i) {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="w-full max-w-2xl px-6 py-10 pb-28 flex flex-col gap-6">
      <Button variant="default" size="sm" className="self-start" onClick={() => navigate(-1)}>
        ← Back
      </Button>

      <Card className="bg-white rounded-none">
        <Card.Header>
          <h1 className="font-head text-2xl tracking-tight">{song.trackName}</h1>
          <p className="text-[--muted-foreground] text-sm mt-1">
            {song.artistName}{song.albumName ? ` — ${song.albumName}` : ""}
          </p>
        </Card.Header>
      </Card>

      <div className="flex flex-col gap-0.5">
        {lines.map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-4" />
          ) : (
            <p
              key={i}
              onClick={() => toggleLine(i)}
              className={`
                px-3 py-1.5 cursor-pointer select-none font-sans text-base font-medium leading-relaxed
                border border-transparent transition-all
                ${selectedLines.has(i)
                  ? "bg-[#c4b8f0] border-black shadow-xs font-medium translate-x-1"
                  : "hover:bg-black/5 hover:border-black/20"
                }
              `}
            >
              {line}
            </p>
          )
        )}
      </div>

      {selectedLines.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="bg-primary border-2 border-black shadow-md px-4 py-2.5 font-head text-sm whitespace-nowrap pointer-events-none">
            {selectedLines.size} line{selectedLines.size !== 1 ? "s" : ""} selected
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const selectedText = lines
                .filter((_, i) => selectedLines.has(i))
                .filter((l) => l.trim() !== "");
              navigate("/card", { state: { song, lines: selectedText } });
            }}
          >
            Generate →
          </Button>
        </div>
      )}
    </div>
  );
}
