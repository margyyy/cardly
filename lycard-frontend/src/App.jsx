import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import { Loader } from "@/components/retroui/Loader";
import SongPage from "./SongPage.jsx";
import CardPage from "./CardPage.jsx";
import { useLang } from "./LanguageContext.jsx";

const API_URL = "https://andreas-association-suggestions-bit.trycloudflare.com";

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

// ── Search Form ──────────────────────────────────────────────────
function SearchForm({ onSearch, loading }) {
  const { lang, setLang, t } = useLang();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("song");

  function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), type);
  }

  return (
    <Card className="w-full bg-white rounded-none">
      <Card.Header>
        <h1 className="font-head text-3xl tracking-tight">Cardly</h1>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
          />
          <div className="flex items-center gap-2">
            {["song", "artist"].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={`flex-1 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all ${
                  type === tp
                    ? "bg-black text-white shadow-none translate-y-0.5"
                    : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
                }`}
              >
                {tp === "song" ? t.songs : t.artists}
              </button>
            ))}
            <div className="flex ml-auto">
              {["en", "it"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 border-2 border-black font-head text-xs uppercase tracking-widest transition-all first:border-r-0 ${
                    lang === l
                      ? "bg-black text-white shadow-none translate-y-0.5"
                      : "bg-white text-black shadow-sm hover:shadow-none hover:translate-y-0.5"
                  }`}
                >
                  {l === "en" ? "ENG" : "IT"}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="self-start">
            {loading ? <Loader size="sm" variant="default" /> : t.search}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}

// ── Results: Songs ───────────────────────────────────────────────
function SongResults({ songs, onPick }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {songs.map((song) => (
        <Card
          key={song.id}
          className="cursor-pointer bg-white rounded-none hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
          onClick={() => onPick(song)}
        >
          {song.image && (
            <img
              src={song.image}
              alt=""
              className="w-full aspect-square object-cover"
            />
          )}
          <Card.Header>
            <Card.Title>{song.title}</Card.Title>
            {song.artistName && (
              <Card.Description>{song.artistName}</Card.Description>
            )}
            {song.albumName && (
              <Card.Description>{song.albumName}</Card.Description>
            )}
          </Card.Header>
        </Card>
      ))}
    </div>
  );
}

// ── Results: Artists ─────────────────────────────────────────────
function ArtistResults({ artists, onPick }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {artists.map((a) => (
        <Card
          key={a.id}
          className="cursor-pointer bg-white rounded-none hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
          onClick={() => onPick(a)}
        >
          {a.image && (
            <img
              src={a.image}
              alt=""
              className="w-full aspect-square object-cover"
            />
          )}
          <Card.Header>
            <Card.Title>{a.name}</Card.Title>
          </Card.Header>
        </Card>
      ))}
    </div>
  );
}

// ── Artist Page (songs list) ─────────────────────────────────────
function ArtistSongs({ artist, onBack, onPickSong }) {
  const { t } = useLang();
  const [songs, setSongs] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadSongs(p) {
    setLoading(true);
    try {
      const data = await apiGet(
        `/artists/${artist.id}/songs?page=${p}&sort=popularity`,
      );
      setSongs((prev) => (p === 1 ? data.songs : [...prev, ...data.songs]));
      setNextPage(data.nextPage);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !loading) loadSongs(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" onClick={onBack}>
          {t.back}
        </Button>
        <h2 className="font-head text-lg">{artist.name}</h2>
      </div>
      {loading && songs.length === 0 ? (
        <Loader />
      ) : (
        <>
          <SongResults songs={songs} onPick={onPickSong} />
          {nextPage && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              onClick={() => loadSongs(nextPage)}
              disabled={loading}
            >
              {loading ? <Loader size="sm" /> : t.loadMore}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────────────
function HomePage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [view, setView] = useState(null);

  async function handleSearch(q, type) {
    setLoading(true);
    setError(null);
    setResults(null);
    setView(null);
    try {
      const data = await apiGet(
        `/search?q=${encodeURIComponent(q)}&type=${type}`,
      );
      if (!data.results || data.results.length === 0) {
        setError(t.noResults);
        return;
      }
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(t.searchFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickSong(song) {
    navigate(`/song/${song.id}`, {
      state: {
        songId: song.id,
        songPath: song.path,
        song: {
          trackName: song.title,
          artistName: song.artistName,
          albumName: song.albumName,
        },
      },
    });
  }

  return (
    <div className="w-full max-w-xl px-6 py-12 flex flex-col gap-6">
      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <p className="border-2 border-[--destructive] bg-white px-4 py-3 text-[--destructive] font-head text-sm shadow-md">
          {error}
        </p>
      )}

      {view?.type === "artist" && (
        <ArtistSongs
          artist={view.data}
          onBack={() => setView(null)}
          onPickSong={handlePickSong}
        />
      )}

      {!view && results?.type === "songs" && (
        <SongResults songs={results.results} onPick={handlePickSong} />
      )}

      {!view && results?.type === "artists" && (
        <ArtistResults
          artists={results.results}
          onPick={(a) => setView({ type: "artist", data: a })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/song/:id" element={<SongPage />} />
      <Route path="/card" element={<CardPage />} />
    </Routes>
  );
}
