import { Elysia, t } from "elysia";
import axios from "axios";
import * as cheerio from "cheerio";
import { api } from "./api.js";
import { cors } from "@elysiajs/cors";

// ── Search (songs, artists, albums) ──────────────────────────────
async function search(q: string, type?: string) {
  const { data } = await api.get("/search", {
    params: { q },
  });

  const hits = data.response.hits as any[];

  if (type === "artist") {
    const seen = new Map<number, any>();
    for (const hit of hits) {
      const a = hit.result.primary_artist;
      if (!seen.has(a.id)) {
        seen.set(a.id, {
          id: a.id,
          name: a.name,
          image: a.image_url,
        });
      }
    }
    return { type: "artists", results: [...seen.values()] };
  }

  if (type === "album") {
    const seen = new Map<number, any>();
    for (const hit of hits) {
      const song = hit.result;
      if (song.album) {
        const al = song.album;
        if (!seen.has(al.id)) {
          seen.set(al.id, {
            id: al.id,
            name: al.name,
            image: al.cover_art_url,
            artistName: song.primary_artist?.name,
          });
        }
      }
    }
    return { type: "albums", results: [...seen.values()] };
  }

  // default: songs
  return {
    type: "songs",
    results: hits.map((hit: any) => ({
      id: hit.result.id,
      title: hit.result.title,
      artistName: hit.result.primary_artist?.name,
      albumName: hit.result.album?.name,
      image: hit.result.song_art_image_thumbnail_url,
      path: hit.result.path,
    })),
  };
}

// ── Artist details ───────────────────────────────────────────────
async function getArtist(id: number) {
  const { data } = await api.get(`/artists/${id}`);
  const a = data.response.artist;
  return {
    id: a.id,
    name: a.name,
    image: a.image_url,
    description: a.description_preview,
  };
}

// ── Artist songs (paginated) ─────────────────────────────────────
async function getArtistSongs(id: number, page: number, sort: string) {
  const { data } = await api.get(`/artists/${id}/songs`, {
    params: { per_page: 20, page, sort },
  });
  return {
    songs: (data.response.songs as any[]).map((s: any) => ({
      id: s.id,
      title: s.title,
      artistName: s.primary_artist?.name,
      albumName: s.album?.name,
      image: s.song_art_image_thumbnail_url,
      path: s.path,
    })),
    nextPage: data.response.next_page,
  };
}

// ── Album tracks ─────────────────────────────────────────────────
async function getAlbumTracks(id: number, page: number) {
  const { data } = await api.get(`/albums/${id}/tracks`, {
    params: { per_page: 50, page },
  });
  return {
    tracks: (data.response.tracks as any[]).map((t: any) => ({
      id: t.song.id,
      title: t.song.title,
      number: t.number,
      artistName: t.song.primary_artist?.name,
      image: t.song.song_art_image_thumbnail_url,
      path: t.song.path,
    })),
    nextPage: data.response.next_page,
  };
}

// ── Song details ──────────────────────────────────────────────────
async function getSong(id: number) {
  const { data } = await api.get(`/songs/${id}`);
  const s = data.response.song;
  return {
    id: s.id,
    title: s.title,
    artistName: s.primary_artist.name,
    albumName: s.album?.name || "Unknown Album",
    image: s.song_art_image_url,
  };
}

// ── Lyrics scraping ──────────────────────────────────────────────
const lyricsCache = new Map<number, string>();

async function scrapeLyrics(
  songId: number,
  songPath?: string,
): Promise<string> {
  if (lyricsCache.has(songId)) return lyricsCache.get(songId)!;

  // 1. Get song path from Genius API (skip if already provided)
  let path = songPath;
  if (!path) {
    const { data } = await api.get(`/songs/${songId}`);
    path = data.response.song.path as string;
  }

  // 2. Fetch the Genius page via ScraperAPI
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    console.error("SCRAPERAPI_KEY is missing");
    return "DEBUG_ERROR: SCRAPERAPI_KEY is missing in environment variables.";
  }

  try {
    const page = await axios.get("https://api.scraperapi.com/", {
      params: {
        api_key: apiKey,
        url: `https://genius.com${path}`,
      },
    });

    // 3. Parse lyrics with cheerio
    const $ = cheerio.load(page.data);
    const containers = $('[data-lyrics-container="true"]');

    if (containers.length === 0) {
      console.error("No lyrics containers found. HTML preview:", page.data.slice(0, 200));
      return `DEBUG_ERROR: No lyrics containers found. HTML start: ${page.data.slice(0, 100)}`;
    }

    // Remove non-lyric elements before extracting text
    containers
      .find("img, noscript, .LyricsHeader, [class*='Contributors']")
      .remove();
    containers.find("br").replaceWith("\n");

    let lyrics = "";
    containers.each((_, el) => {
      lyrics += $(el).text() + "\n";
    });

    lyrics = lyrics.trim();

    // Strip the junk header
    const firstBracket = lyrics.indexOf("[");
    if (
      firstBracket > 0 &&
      /contributors|read more|translations/i.test(lyrics.slice(0, firstBracket))
    ) {
      lyrics = lyrics.slice(firstBracket).trim();
    }

    lyricsCache.set(songId, lyrics);
    return lyrics;
  } catch (err: any) {
    console.error("Scraping failed:", err.message);
    return `DEBUG_ERROR: Scraping failed - ${err.message}`;
  }
}

// ── Elysia app ───────────────────────────────────────────────────
const app = new Elysia()
  .use(cors())
  .get("/search", ({ query }) => search(query.q!, query.type), {
    query: t.Object({
      q: t.String(),
      type: t.Optional(t.String()),
    }),
  })
  .get("/artists/:id", ({ params }) => getArtist(Number(params.id)))
  .get(
    "/artists/:id/songs",
    ({ params, query }) =>
      getArtistSongs(
        Number(params.id),
        Number(query.page ?? 1),
        query.sort ?? "popularity",
      ),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        sort: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/albums/:id/tracks",
    ({ params, query }) =>
      getAlbumTracks(Number(params.id), Number(query.page ?? 1)),
    {
      query: t.Object({
        page: t.Optional(t.String()),
      }),
    },
  )
  .get("/songs/:id", ({ params }) => getSong(Number(params.id)))
  .get(
    "/songs/:id/lyrics",
    ({ params, query }) => scrapeLyrics(Number(params.id), query.path),
    { query: t.Object({ path: t.Optional(t.String()) }) },
  );

export default app;
