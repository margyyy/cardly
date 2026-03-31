import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import axios from "axios";
import * as cheerio from "cheerio";

const api = axios.create({
  baseURL: "https://api.genius.com",
  headers: {
    Authorization: `Bearer ${process.env.GENIUS_TOKEN}`,
  },
});

const lyricsCache = new Map<number, string>();

async function scrapeLyrics(
  songId: number,
  songPath?: string,
): Promise<string> {
  if (lyricsCache.has(songId)) return lyricsCache.get(songId)!;

  let path = songPath;
  if (!path) {
    const { data } = await api.get(`/songs/${songId}`);
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
    const { data } = await api.get("/search", { params: { q: query.q } });
    return data.response.hits.map((hit: any) => ({
      id: hit.result.id,
      title: hit.result.title,
      path: hit.result.path,
    }));
  })
  .get(
    "/songs/:id/lyrics",
    async ({ params, query }) =>
      await scrapeLyrics(Number(params.id), query.path),
  )
  .listen(3000);

console.log("🦊 Server Arch (Bun Native Fetch) pronto su porta 3000");
