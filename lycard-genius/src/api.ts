import axios from "axios";

export const api = axios.create({
  baseURL: "https://api.genius.com",
  headers: {
    Authorization: `Bearer ${process.env.GENIUS_TOKEN}`,
  },
});
