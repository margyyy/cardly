import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./SongPage.css";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Loader } from "@/components/retroui/Loader";
import { useLang } from "./LanguageContext.jsx";

const API_URL = import.meta.env.VITE_API_URL;

export default function SongPage() {
  const { t } = useLang();
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [song, setSong] = useState(state?.song || null);
  const songId = state?.songId || id;
  const songPath = state?.songPath || null;

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState(null); // translation key
  const [selectedLines, setSelectedLines] = useState(new Set());

  useEffect(() => {
    if (!songId) return;

    if (!song) {
      fetch(`${API_URL}/songs/${songId}`)
        .then((res) => res.json())
        .then((data) => {
          setSong({
            trackName: data.title,
            artistName: data.artistName,
            albumName: data.albumName,
          });
        })
        .catch(() => setErrorKey("errorSongDetails"));
    }

    setLoading(true);
    setErrorKey(null);
    const lyricsUrl = `${API_URL}/songs/${songId}/lyrics${songPath ? `?path=${encodeURIComponent(songPath)}` : ""}`;
    fetch(lyricsUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch lyrics");
        return res.text();
      })
      .then((text) => setLyrics(text))
      .catch(() => setErrorKey("errorLyrics"))
      .finally(() => setLoading(false));
  }, [songId, song]);

  if (!song && !loading && errorKey) {
    return (
      <div className="song-page error-container">
        <h2>{t.error}</h2>
        <p>{t[errorKey]}</p>
        <Button onClick={() => navigate("/")}>{t.goHome}</Button>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader size="lg" />
      </div>
    );
  }

  const lines = lyrics ? lyrics.split("\n") : [];

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
      <Button
        variant="default"
        size="sm"
        className="self-start"
        onClick={() => navigate(-1)}
      >
        {t.back}
      </Button>

      <Card className="bg-white rounded-none">
        <Card.Header>
          <h1 className="font-head text-2xl tracking-tight">
            {song.trackName}
          </h1>
          <p className="text-[--muted-foreground] text-sm mt-1">
            {song.artistName}
            {song.albumName ? ` — ${song.albumName}` : ""}
          </p>
        </Card.Header>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {errorKey && (
        <p className="border-2 border-[--destructive] bg-white px-4 py-3 text-[--destructive] font-head text-sm shadow-md">
          {t[errorKey]}
        </p>
      )}

      {!loading && !errorKey && lines.length > 0 && (
        <p className="font-head text-xs uppercase tracking-widest text-black/40">{t.hintSelectLines}</p>
      )}

      {!loading && !errorKey && lines.length > 0 && (
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
                  ${
                    selectedLines.has(i)
                      ? "bg-[#c4b8f0] border-black shadow-xs font-medium translate-x-1"
                      : "hover:bg-black/5 hover:border-black/20"
                  }
                `}
              >
                {line}
              </p>
            ),
          )}
        </div>
      )}

      {!loading && !errorKey && lines.length === 0 && lyrics !== null && (
        <p className="text-[--muted-foreground] font-head text-sm">
          {t.noLyrics}
        </p>
      )}

      {selectedLines.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="bg-primary border-2 border-black shadow-md px-4 py-2.5 font-head text-sm whitespace-nowrap pointer-events-none">
            {t.lineSelected(selectedLines.size)}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const selectedText = lines
                .filter((_, i) => selectedLines.has(i))
                .filter((l) => l.trim() !== "");
              const payload = { song, lines: selectedText };
              try {
                const enc = btoa(
                  unescape(encodeURIComponent(JSON.stringify(payload))),
                );
                navigate(`/card?d=${enc}`, { state: payload });
              } catch (e) {
                navigate("/card", { state: payload });
              }
            }}
          >
            {t.generate}
          </Button>
        </div>
      )}
    </div>
  );
}
