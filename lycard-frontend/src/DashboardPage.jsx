import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;
const DASH_PW = "@r15799886R";

export default function DashboardPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (pw !== DASH_PW) {
      setError("Password errata.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/stats?pw=cardly2024`);
      if (!res.ok) throw new Error("Errore nel fetch stats");
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } catch (err) {
      setError("Impossibile caricare i dati.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    setCsvLoading(true);
    try {
      const res = await fetch(`${API_URL}/events?pw=${encodeURIComponent(DASH_PW)}`);
      if (!res.ok) throw new Error("Errore nel fetch eventi");
      const rows = await res.json();
      const header = "song,artist,lines,format,ts";
      const lines = rows.map((r) =>
        ["song", "artist", "lines", "format", "ts"]
          .map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cardly-events.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setCsvLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-white border-2 border-black shadow-[4px_4px_0_#000] p-8 flex flex-col gap-4 w-80"
        >
          <h2 className="font-head text-xl tracking-tight">Dashboard</h2>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="border-2 border-black px-3 py-2 text-sm focus:outline-none bg-white"
            autoFocus
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white py-2 font-head text-sm tracking-widest uppercase hover:bg-gray-800"
          >
            {loading ? "Caricamento..." : "Accedi"}
          </button>
        </form>
      </div>
    );
  }

  const { totalDownloads, topSongs, topArtists, byFormat, perDay } = data;

  return (
    <div className="w-full px-8 py-12 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-3xl tracking-tight">Cardly Dashboard</h1>
          <p className="text-sm text-black/50 mt-1">
            Download totali: <strong>{totalDownloads}</strong>
          </p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={csvLoading}
          className="bg-black text-white px-4 py-2 font-head text-xs uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50"
        >
          {csvLoading ? "..." : "Download CSV (tutto)"}
        </button>
      </div>

      {/* Top Songs */}
      <section>
        <h2 className="font-head text-lg mb-2">Top Canzoni</h2>
        <table className="w-full border-2 border-black bg-white text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Canzone</th>
              <th className="px-3 py-2 text-left">Download</th>
            </tr>
          </thead>
          <tbody>
            {topSongs.slice(0, 100).map((row, i) => (
              <tr key={i} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-3 py-2 text-black/40">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{row.song || "—"}</td>
                <td className="px-3 py-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Top Artists */}
      <section>
        <h2 className="font-head text-lg mb-2">Top Artisti</h2>
        <table className="w-full border-2 border-black bg-white text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Artista</th>
              <th className="px-3 py-2 text-left">Download</th>
            </tr>
          </thead>
          <tbody>
            {topArtists.map((row, i) => (
              <tr key={i} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-3 py-2 text-black/40">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{row.artist || "—"}</td>
                <td className="px-3 py-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* By Format */}
      <section>
        <h2 className="font-head text-lg mb-2">Per Formato</h2>
        <table className="w-full border-2 border-black bg-white text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2 text-left">Formato</th>
              <th className="px-3 py-2 text-left">Download</th>
            </tr>
          </thead>
          <tbody>
            {byFormat.map((row, i) => (
              <tr key={i} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-3 py-2 font-medium">{row.format || "—"}</td>
                <td className="px-3 py-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Downloads per day */}
      <section>
        <h2 className="font-head text-lg mb-2">Download ultimi 30 giorni</h2>
        <table className="w-full border-2 border-black bg-white text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2 text-left">Giorno</th>
              <th className="px-3 py-2 text-left">Download</th>
            </tr>
          </thead>
          <tbody>
            {[...perDay].reverse().map((row, i) => (
              <tr key={i} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-3 py-2 font-medium">{row.day}</td>
                <td className="px-3 py-2">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
