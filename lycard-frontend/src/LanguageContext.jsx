import { createContext, useContext, useState } from "react";

const translations = {
  en: {
    search: "Search",
    searchPlaceholder: "Search...",
    songs: "Songs",
    artists: "Artists",
    back: "← Back",
    loadMore: "Load more",
    noResults: "No results found.",
    searchFailed:
      "Search failed. Check console for details or make sure the backend is running & Genius token is valid.",
    noLyrics: "No lyrics found for this song.",
    lineSelected: (n) => `${n} line${n !== 1 ? "s" : ""} selected`,
    generate: "Generate →",
    goHome: "Go Home",
    error: "Error",
    errorSongDetails: "Could not load song details.",
    errorLyrics: "Could not load lyrics.",
    editBackground: "Edit Background",
    changeBackground: "Change background",
    uploadBackground: "Upload background",
    edit: "Edit",
    apply: "Apply",
    cancel: "Cancel",
    editText: "Edit Text",
    fontSize: "Font size",
    textColor: "Text color",
    colorWhite: "white",
    colorBlack: "black",
    lineBar: "Line bar",
    lineBarNone: "none",
    barOpacity: "Bar opacity",
    downloadPng: "Download PNG",
    zoom: "Zoom",
    blur: "Blur",
    changeStyle: "Change Style",
    stylePortrait: "9:16",
    styleSquare: "Square",
    spacedText: "Spaced Text",
    activate: "Activate",
    deactivate: "Deactivate",
    randomize: "Randomize",
  },
  it: {
    search: "Cerca",
    searchPlaceholder: "Cerca...",
    songs: "Canzoni",
    artists: "Artisti",
    back: "← Indietro",
    loadMore: "Carica altri",
    noResults: "Nessun risultato.",
    searchFailed:
      "Ricerca fallita. Controlla la console o assicurati che il backend sia attivo.",
    noLyrics: "Nessun testo trovato per questo brano.",
    lineSelected: (n) =>
      `${n} ${n !== 1 ? "righe selezionate" : "riga selezionata"}`,
    generate: "Genera →",
    goHome: "Torna alla home",
    error: "Errore",
    errorSongDetails: "Impossibile caricare i dettagli del brano.",
    errorLyrics: "Impossibile caricare il testo.",
    editBackground: "Modifica sfondo",
    changeBackground: "Cambia sfondo",
    uploadBackground: "Carica sfondo",
    edit: "Modifica",
    apply: "Applica",
    cancel: "Annulla",
    editText: "Modifica testo",
    fontSize: "Dimensione font",
    textColor: "Colore testo",
    colorWhite: "bianco",
    colorBlack: "nero",
    lineBar: "Barra",
    lineBarNone: "nessuna",
    barOpacity: "Opacità barra",
    downloadPng: "Scarica PNG",
    zoom: "Zoom",
    blur: "Sfocatura",
    changeStyle: "Cambia stile",
    stylePortrait: "9:16",
    styleSquare: "Quadrato",
    spacedText: "Spaced Text",
    activate: "Attiva",
    deactivate: "Disattiva",
    randomize: "Randomizza",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = translations[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
