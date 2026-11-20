# Salsa & Bachata · Figure

PWA in Vue 3 + Vite per le figure di salsa e bachata, con accesso Appwrite e video riservati agli utenti autenticati.

## Sviluppo

```bash
pnpm install
pnpm dev
```

Verifica: `pnpm test` per i test di regressione, `pnpm build` per la build di produzione.

## Appwrite e accesso

La configurazione pubblica predefinita punta al progetto `dance-salsa-bachata` nella regione `fra`. Per usare un altro progetto, copia [.env.example](.env.example) in `.env.local` e configura database, tabella e bucket. Non inserire mai API key nelle variabili `VITE_*`.

- Registrazione con nome, email, password e conferma password; accesso automatico dopo la registrazione.
- Accesso email/password oppure Google, se il provider è configurato nel progetto.
- Le pagine delle danze e delle figure richiedono una sessione valida. I dati non sono inclusi nel bundle pubblico né memorizzati nella cache della PWA.
- Il contenuto pubblico è disattivato per impostazione predefinita. Imposta `VITE_FEATURE_PUBLIC_CONTENT=true` solo se vuoi consentire l'accesso ospite e hai configurato di conseguenza i permessi Appwrite; il deploy GitHub Pages forza il valore sicuro `false`.
- Registra i domini del sito come piattaforme Web in Appwrite (`localhost` per lo sviluppo).
- Se l'autenticazione è disattivata tramite feature flag, le pagine protette restano inaccessibili.

### Risorse e ruoli

- Database TablesDB: `dance`; tabella: `figures`.
- Colonne: `nome` (varchar 255, obbligatorio), `danza` (enum salsa/bachata, obbligatorio), `stili` (array varchar 64, obbligatorio), `youtubeId` (varchar 32), `videoFileId` e `imageFileId` (varchar 36).
- Bucket: `figure-media`, massimo **50.000.000 byte per file**. Video: MP4/WebM/MOV; immagini: JPG/JPEG/PNG/WebP.
- Tabella e bucket: lettura `users`; creazione/modifica/eliminazione `label:admin` e `label:superadmin`; sicurezza per singola riga/file disattivata per mantenere una politica uniforme. Nessun accesso ospite.
- Gli utenti registrati hanno il ruolo base Appwrite `users`. Solo tramite Console/MCP/server fidato è possibile assegnare le label `admin` o `superadmin`; preferenze e form del browser non possono concedere privilegi. Un `superadmin` ha gli stessi diritti di modifica di un `admin`, più la gestione utenti.
- Tabella `user_roles` (ID riga = ID utente): ruolo `user`, `admin` o `superadmin`, usato dalla dashboard per la gestione utenti. Modificare il ruolo lì non concede diritti Appwrite; i diritti dipendono dalle label.
- L'autenticazione anonima è disattivata: serve registrarsi o accedere con un account.
- I JSON in [src/data/](src/data/) contengono solo i metadati pubblici delle danze e degli stili. Le 11 figure iniziali sono state migrate in Appwrite.

### Aggiungere figure, immagini e video

Apri **Profilo** per accedere alla dashboard: riepilogo del repertorio, disponibilità dei video, catalogo ricercabile e dettagli dell'account. Puoi combinare ricerca per nome, danza e disponibilità video; **Vedi le figure senza video** porta direttamente al catalogo filtrato. Su laptop la navigazione laterale collega le sezioni; su mobile i controlli e il catalogo si adattano allo schermo.

Con un account con label `admin`, usa **Nuova figura** oppure il pulsante di modifica di una riga del catalogo. Nell'editor puoi scegliere gli stili e caricare video/immagine; in alternativa puoi inserire un ID YouTube di 11 caratteri. L'editor occupa lo schermo sui telefoni, chiede conferma prima di scartare modifiche non salvate e conserva i dati se il salvataggio fallisce. Gli altri utenti possono consultare il catalogo e aprire le figure, senza controlli di modifica.

I video Appwrite hanno la precedenza su YouTube. I caricamenti falliti prima del salvataggio della riga vengono rimossi; sostituire un file mantiene quello precedente nel bucket, senza eliminazioni distruttive automatiche.

I media privati vengono caricati con richieste SDK autenticate e visualizzati con URL Blob temporanei, revocati quando si lascia la pagina o si esce dall'account. Questo funziona anche con cookie di terze parti bloccati, ma richiede il download completo del file prima della riproduzione. Un video YouTube rimane soggetto alla visibilità impostata su YouTube: per media realmente privati usa il bucket Appwrite. I file MOV dipendono dai codec supportati dal browser; MP4/WebM sono preferibili.

## Deploy automatico (GitHub Actions)

Il workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builda e pubblica il sito a ogni push su `main`.

Configurazione una tantum:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Custom domain**: `dance.nimakarimi.me` (il file `CNAME` è già in `public/` e finisce in `dist/`).
3. Dopo il primo DNS corretto, abilita **Enforce HTTPS**.

DNS su Namecheap (Advanced DNS):
- Tipo `CNAME Record`, Host `dance`, Valore `<tuo-utente>.github.io.`, TTL Automatic.

Il routing usa URL puliti (ad esempio `/danza/salsa`). Il file `public/404.html` ripristina le rotte dirette su GitHub Pages; includilo nel deploy insieme al sito.
