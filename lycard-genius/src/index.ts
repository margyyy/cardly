import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import * as cheerio from "cheerio";

const GENIUS_API = "https://api.genius.com";

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
    // Usiamo il FETCH nativo di Bun con header da browser reale
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

new Elysia()
  .use(cors())
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
          image: a.image_url ?? null,
        }));
      return { type: "artists", results };
    }

    const results = hits.map((hit: any) => ({
      id: hit.result.id,
      title: hit.result.title,
      artistName: hit.result.primary_artist?.name ?? null,
      albumName: hit.result.album?.name ?? null,
      image: hit.result.song_art_image_thumbnail_url ?? null,
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
  .listen(3000);

console.log("🦊 Server Arch (Bun Native Fetch) pronto su porta 3000");
