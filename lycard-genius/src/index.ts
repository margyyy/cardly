import { Elysia } from "elysia";
import axios from "axios";
import * as cheerio from "cheerio";
import { api } from "./api.js";
import { cors } from "@elysiajs/cors";

type SongDTO = {
  q?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
};

type SongResponseDTO = {
  id: number;
  trackname: string;
  artistName: string;
  albumname: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
};

async function getLyrics(params: SongDTO): Promise<SongResponseDTO[]> {
  // Validate input parameters
  if (!params.album_name && (!params.track_name || !params.artist_name)) {
    throw new Error(
      "You must provide either album_name, or both track_name and artist_name.",
    );
  }

  const response = await api.get("/search", {
    params: {
      q: params.q,
      track_name: params.track_name,
      artist_name: params.artist_name,
      album_name: params.album_name,
    },
  });

  return response.data;
}

const app = new Elysia()
  .use(cors())
  .get("/lyrics", ({ query }) => getLyrics(query));

export default app;
