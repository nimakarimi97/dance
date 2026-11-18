# Salsa & Bachata · Figure

PWA in Vue 3 + Vite per le figure di salsa e bachata, con video YouTube incorporati.

## Sviluppo

```bash
pnpm install
pnpm dev
```

## Aggiungere i video

1. Carica il video su YouTube (anche come "non in elenco").
2. Copia l'ID dall'URL: `youtube.com/watch?v=ABC123xyz` → `ABC123xyz`.
3. In [src/data/danze.js](src/data/danze.js) sostituisci `youtubeId: null` con l'ID.
4. Per nuove figure o stili, modifica gli array `figure` e `danze` nello stesso file.

## Deploy su GitHub Pages

1. Crea un repository GitHub (es. `dance`) e fai push del codice.
2. Esegui `pnpm deploy`: builda in `dist/` e pubblica il branch `gh-pages`.
3. Nelle impostazioni del repo: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
4. In **Custom domain** inserisci `dance.nimakarimi.me` (il file `CNAME` è già in `public/`).
5. Dal tuo DNS crea un record `CNAME`: `dance` → `<tuo-utente>.github.io`.
6. Abilita **Enforce HTTPS** quando compare.

Il routing usa l'hash (`/#/danza/salsa`), quindi non servono configurazioni extra su GitHub Pages.
