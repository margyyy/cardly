import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Loader } from "@/components/retroui/Loader";
import SongPage from "./SongPage.jsx";
import CardPage from "./CardPage.jsx";

const API_URL = "https://cardly-ugit.vercel.app/lyrics";

async function fetchSongs({ artistName, trackName, albumName }) {
  const params = new URLSearchParams();
  if (artistName) params.set("artist_name", artistName);
  if (trackName) params.set("track_name", trackName);
  if (albumName) params.set("album_name", albumName);
  const res = await fetch(`${API_URL}?${params}`);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function groupByAlbum(songs) {
  const map = {};
  for (const song of songs) {
    const album = song.albumName || "—";
    if (!map[album]) map[album] = [];
    map[album].push(song);
  }
  return map;
}

function SearchForm({ onSearch, loading }) {
  const [artistName, setArtistName] = useState("");
  const [trackName, setTrackName] = useState("");
  const [albumName, setAlbumName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const onlyArtist = artistName && !trackName && !albumName;
    const onlyTrack = trackName && !artistName && !albumName;
    if (onlyArtist || onlyTrack) {
      alert("Please enter at least: artist + song, or album only.");
      return;
    }
    if (!artistName && !trackName && !albumName) {
      alert("Please fill in at least one field.");
      return;
    }
    onSearch({ artistName, trackName, albumName });
  }

  return (
    <Card className="w-full bg-white rounded-none">
      <Card.Header>
        <h1 className="font-head text-3xl tracking-tight">LyricsCard</h1>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artistName" className="font-head text-sm">
              Artist
            </Label>
            <Input
              id="artistName"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="e.g. Radiohead"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trackName" className="font-head text-sm">
              Song
            </Label>
            <Input
              id="trackName"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              placeholder="e.g. Creep"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="albumName" className="font-head text-sm">
              Album
            </Label>
            <Input
              id="albumName"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="e.g. Pablo Honey"
            />
          </div>
          <p className="text-xs text-[--muted-foreground]">
            Required: artist + song, or album only
          </p>
          <Button type="submit" disabled={loading} className="self-start">
            {loading ? <Loader size="sm" variant="default" /> : "Search"}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}

function AlbumPicker({ albums, onPick }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-head text-xs uppercase tracking-widest text-[--muted-foreground]">
        Select an album
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {Object.keys(albums).map((album) => (
          <Card
            key={album}
            className="cursor-pointer bg-white rounded-none hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
            onClick={() => onPick(album)}
          >
            <Card.Header>
              <Card.Title>{album}</Card.Title>
              {albums[album][0]?.artistName && (
                <Card.Description>
                  {albums[album][0].artistName}
                </Card.Description>
              )}
              <Card.Description>
                {albums[album].length} track
                {albums[album].length !== 1 ? "s" : ""}
              </Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SongPicker({ songs, onPick }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-head text-xs uppercase tracking-widest text-[--muted-foreground]">
        Select a song
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {songs.map((song) => (
          <Card
            key={song.id}
            className="cursor-pointer bg-white rounded-none hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
            onClick={() => onPick(song)}
          >
            <Card.Header>
              <Card.Title>{song.trackName}</Card.Title>
              {song.artistName && (
                <Card.Description>{song.artistName}</Card.Description>
              )}
              {song.albumName && (
                <Card.Description>{song.albumName}</Card.Description>
              )}
              {song.duration && (
                <Card.Description>
                  {formatDuration(song.duration)}
                </Card.Description>
              )}
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [albums, setAlbums] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  async function handleSearch(params) {
    setLoading(true);
    setError(null);
    setAlbums(null);
    setSelectedAlbum(null);
    try {
      const songs = await fetchSongs(params);
      if (!songs || songs.length === 0) {
        setError("No results found.");
        return;
      }
      const grouped = groupByAlbum(songs);
      const albumKeys = Object.keys(grouped);
      if (albumKeys.length === 1) {
        setAlbums(grouped);
        setSelectedAlbum(albumKeys[0]);
      } else {
        setAlbums(grouped);
      }
    } catch {
      setError("Search failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (selectedAlbum && Object.keys(albums).length > 1) {
      setSelectedAlbum(null);
    } else {
      setAlbums(null);
      setSelectedAlbum(null);
    }
  }

  return (
    <div className="w-full max-w-xl px-6 py-12 flex flex-col gap-6">
      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <p className="border-2 border-[--destructive] bg-white px-4 py-3 text-[--destructive] font-head text-sm shadow-md">
          {error}
        </p>
      )}

      {albums && (
        <div className="flex flex-col gap-4">
          {Object.keys(albums).length > 1 && !selectedAlbum && (
            <AlbumPicker albums={albums} onPick={setSelectedAlbum} />
          )}
          {selectedAlbum && (
            <>
              {Object.keys(albums).length > 1 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBack}
                  className="self-start"
                >
                  ← Back to albums
                </Button>
              )}
              <SongPicker
                songs={albums[selectedAlbum]}
                onPick={(song) => navigate("/song", { state: { song } })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/song" element={<SongPage />} />
      <Route path="/card" element={<CardPage />} />
    </Routes>
  );
}
