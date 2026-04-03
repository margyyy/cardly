import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import * as cheerio from "cheerio";
import { Database } from "bun:sqlite";

const GENIUS_API = "https://api.genius.com";

// ── Analytics DB setup ────────────────────────────────────────────
const db = new Database("analytics.db");
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    song    TEXT,
    artist  TEXT,
    lines   INTEGER,
    format  TEXT,
    ts      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`);

const STATS_PW = process.env.STATS_PW;
const DASH_PW  = process.env.DASH_PW;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

if (!STATS_PW || !DASH_PW) {
  throw new Error("STATS_PW and DASH_PW must be set in environment variables");
}

// Session token generated fresh on each server start (in-memory only)
const SESSION_TOKEN = crypto.randomUUID();

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cleanImage(url: string | null | undefined): string | null {
  if (!url || url.includes("default_cover_image") || url.includes("assets.genius.com/images/default")) return null;
  return url;
}

async function apiGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${GENIUS_API}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${process.env.GENIUS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Genius API error: ${res.status}`);
  return res.json();
}

const lyricsCache = new Map<number, string>();

async function scrapeLyrics(
  songId: number,
  songPath?: string,
): Promise<string> {
  if (lyricsCache.has(songId)) return lyricsCache.get(songId)!;

  let path = songPath;
  if (!path) {
    const data = await apiGet(`/songs/${songId}`);
    path = data.response.song.path as string;
  }

  const cleanPath = path.startsWith("http") ? new URL(path).pathname : path;

  try {
    const response = await fetch(`https://genius.com${cleanPath}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`Genius ha risposto con status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const containers = $('[data-lyrics-container="true"]');

    if (containers.length === 0)
      return "Testo non trovato (struttura cambiata).";

    containers
      .find("img, noscript, .LyricsHeader, [class*='Contributors']")
      .remove();
    containers.find("br").replaceWith("\n");

    let lyrics = "";
    containers.each((_, el) => {
      lyrics += $(el).text() + "\n";
    });

    lyrics = lyrics.trim();
    const bi = lyrics.indexOf("[");
    if (bi > 0) lyrics = lyrics.slice(bi).trim();

    lyricsCache.set(songId, lyrics);
    return lyrics;
  } catch (err: any) {
    console.error("Errore Scraping:", err.message);
    return `ERRORE_SCRAPING: ${err.message}`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function isAuthenticated(cookies: Record<string, { value: string } | string | undefined>): boolean {
  const raw = cookies["dash_session"];
  const value = typeof raw === "object" && raw !== null ? raw.value : raw;
  return value === SESSION_TOKEN;
}

function setCookieHeader() {
  return `dash_session=${SESSION_TOKEN}; HttpOnly; Path=/; SameSite=Strict`;
}

new Elysia()
  .use(cors({ origin: FRONTEND_URL }))

  // ── Public: search & lyrics ──────────────────────────────────────
  .get("/search", async ({ query }) => {
    const type = (query.type as string) ?? "song";
    const data = await apiGet("/search", { q: query.q as string });
    const hits = data.response.hits;

    if (type === "artist") {
      const seen = new Set<number>();
      const results = hits
        .map((hit: any) => hit.result.primary_artist)
        .filter((a: any) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        })
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          image: cleanImage(a.image_url),
        }));
      return { type: "artists", results };
    }

    const results = hits.map((hit: any) => ({
      id: hit.result.id,
      title: hit.result.title,
      artistName: hit.result.primary_artist?.name ?? null,
      albumName: hit.result.album?.name ?? null,
      image: cleanImage(hit.result.song_art_image_thumbnail_url),
      path: hit.result.path,
    }));
    return { type: "songs", results };
  })

  .get("/artists/:id/songs", async ({ params, query }) => {
    const page = (query.page as string) ?? "1";
    const sort = (query.sort as string) ?? "title";
    const data = await apiGet(`/artists/${params.id}/songs`, { page, sort, per_page: "20" });
    const songs = data.response.songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artistName: s.primary_artist?.name ?? null,
      image: s.song_art_image_thumbnail_url ?? null,
      path: s.path,
    }));
    const nextPage = data.response.next_page ?? null;
    return { songs, nextPage };
  })

  .get("/songs/:id", async ({ params }) => {
    const data = await apiGet(`/songs/${params.id}`);
    const s = data.response.song;
    return {
      id: s.id,
      title: s.title,
      artistName: s.primary_artist?.name ?? null,
      albumName: s.album?.name ?? null,
      image: s.song_art_image_url ?? null,
    };
  })

  .get(
    "/songs/:id/lyrics",
    async ({ params, query }) =>
      await scrapeLyrics(Number(params.id), query.path),
  )

  // ── Public: analytics tracking ───────────────────────────────────
  .post(
    "/track",
    ({ body }) => {
      db.run(
        "INSERT INTO events (song, artist, lines, format) VALUES (?, ?, ?, ?)",
        [body.song, body.artist, body.lines, body.format],
      );
      return { ok: true };
    },
    {
      body: t.Object({
        song:   t.String({ maxLength: 500 }),
        artist: t.String({ maxLength: 500 }),
        lines:  t.Number({ minimum: 0, maximum: 100 }),
        format: t.String({ maxLength: 50 }),
      }),
    },
  )

  // ── Protected: stats JSON ────────────────────────────────────────
  .get("/stats", ({ query }: { query: any }) => {
    if (query.pw !== STATS_PW) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const totalDownloads = (
      db.query("SELECT COUNT(*) as count FROM events").get() as any
    ).count;

    const topSongs = db
      .query(
        "SELECT song, COUNT(*) as count FROM events GROUP BY song ORDER BY count DESC LIMIT 10",
      )
      .all();

    const topArtists = db
      .query(
        "SELECT artist, COUNT(*) as count FROM events GROUP BY artist ORDER BY count DESC LIMIT 10",
      )
      .all();

    const byFormat = db
      .query(
        "SELECT format, COUNT(*) as count FROM events GROUP BY format ORDER BY count DESC",
      )
      .all();

    const perDay = db
      .query(
        `SELECT substr(ts, 1, 10) as day, COUNT(*) as count
         FROM events
         WHERE ts >= strftime('%Y-%m-%dT%H:%M:%SZ', datetime('now', '-30 days'))
         GROUP BY day
         ORDER BY day ASC`,
      )
      .all();

    return { totalDownloads, topSongs, topArtists, byFormat, perDay };
  })

  // ── Protected: dashboard HTML ────────────────────────────────────
  .get("/dashboard", ({ query, cookie }: { query: any; cookie: any }) => {
    const authedViaCookie = isAuthenticated(cookie);
    const authedViaPw = query.pw === DASH_PW;

    if (!authedViaCookie && !authedViaPw) {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
form{background:#fff;padding:2rem;border:2px solid #000;box-shadow:4px 4px 0 #000}
input{border:2px solid #000;padding:.5rem .75rem;font-size:1rem;width:100%;margin-top:.5rem}
button{margin-top:1rem;padding:.5rem 1.5rem;background:#000;color:#fff;border:none;font-size:1rem;cursor:pointer}
</style></head><body>
<form method="get" action="/dashboard">
  <h2 style="margin:0 0 1rem">Dashboard — Password</h2>
  <label>Password<br><input type="password" name="pw" autofocus /></label>
  <br><button type="submit">Accedi</button>
</form></body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // Set session cookie and redirect to clean URL (removes ?pw= from address bar)
    if (authedViaPw && !authedViaCookie) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard",
          "Set-Cookie": setCookieHeader(),
        },
      });
    }

    const total = (db.query("SELECT COUNT(*) as c FROM events").get() as any).c;

    const rows = db.query(
      `SELECT song, artist, COUNT(*) as downloads,
              GROUP_CONCAT(DISTINCT format) as formats
       FROM events
       GROUP BY song, artist
       ORDER BY downloads DESC
       LIMIT 100`
    ).all() as any[];

    const tableRows = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(r.song ?? "—")}</td>
        <td>${escHtml(r.artist ?? "—")}</td>
        <td>${r.downloads}</td>
        <td>${escHtml(r.formats ?? "")}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cardly Dashboard</title>
<style>
*{box-sizing:border-box}body{font-family:sans-serif;margin:0;background:#f5f5f5;padding:2rem}
h1{margin:0 0 .25rem}p.sub{color:#555;margin:0 0 1.5rem}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
a.btn{padding:.5rem 1.25rem;background:#000;color:#fff;text-decoration:none;font-size:.875rem;border:2px solid #000}
a.btn:hover{background:#333}
table{width:100%;border-collapse:collapse;background:#fff;border:2px solid #000}
th,td{padding:.6rem .75rem;text-align:left;border-bottom:1px solid #ddd;font-size:.875rem}
th{background:#000;color:#fff;font-weight:600}tr:hover{background:#fafafa}
.badge{background:#e0e0e0;padding:.1rem .4rem;border-radius:3px;font-size:.75rem}
</style></head><body>
<h1>Cardly Dashboard</h1>
<p class="sub">Total downloads: <strong>${total}</strong> — Top 100 tracks by downloads</p>
<div class="topbar">
  <span style="font-size:.875rem;color:#555">${rows.length} tracks shown</span>
  <a class="btn" href="/dashboard/csv">Download CSV (all)</a>
</div>
<table>
  <thead><tr><th>#</th><th>Song</th><th>Artist</th><th>Downloads</th><th>Formats</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  })

  // ── Protected: CSV export ────────────────────────────────────────
  .get("/dashboard/csv", ({ cookie }: { cookie: any }) => {
    if (!isAuthenticated(cookie)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const rows = db.query(
      `SELECT song, artist, lines, format, ts FROM events ORDER BY ts DESC`
    ).all() as any[];

    const csv = [
      "song,artist,lines,format,ts",
      ...rows.map((r) =>
        [r.song, r.artist, r.lines, r.format, r.ts]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="events.csv"',
      },
    });
  })

  // ── Protected: raw events JSON ───────────────────────────────────
  .get("/events", ({ cookie }: { cookie: any }) => {
    if (!isAuthenticated(cookie)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return db.query(
      `SELECT song, artist, lines, format, ts FROM events ORDER BY ts DESC LIMIT 1000`
    ).all();
  })

  .listen(3000);

console.log("🦊 Server pronto su porta 3000");
