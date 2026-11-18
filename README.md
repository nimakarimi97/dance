# Salsa & Bachata · Figure

PWA in Vue 3 + Vite per le figure di salsa e bachata, con video YouTube incorporati.

## Sviluppo

```bash
pnpm install
pnpm dev
```

## Dati

Ogni danza ha il suo file in `src/data/`:
- [salsa.json](src/data/salsa.json): nome, descrizione, stili e figure di salsa
- [bachata.json](src/data/bachata.json): nome, descrizione, stili e figure di bachata

[src/data/danze.js](src/data/danze.js) li importa e li espone all'app. Non serve modificarlo per aggiungere figure o stili.

## Aggiungere i video

1. Carica il video su YouTube (anche come "non in elenco").
2. Copia l'ID dall'URL: `youtube.com/watch?v=ABC123xyz` → `ABC123xyz`.
3. Nel JSON della danza sostituisci `"youtubeId": null` con `"youtubeId": "ABC123xyz"`.

## Deploy automatico (GitHub Actions)

Il workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builda e pubblica il sito a ogni push su `main`.

Configurazione una tantum:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Custom domain**: `dance.nimakarimi.me` (il file `CNAME` è già in `public/` e finisce in `dist/`).
3. Dopo il primo DNS corretto, abilita **Enforce HTTPS**.

DNS su Namecheap (Advanced DNS):
- Tipo `CNAME Record`, Host `dance`, Valore `<tuo-utente>.github.io.`, TTL Automatic.

Il routing usa l'hash (`/#/danza/salsa`), quindi non servono configurazioni extra su GitHub Pages.
