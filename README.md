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
- Le pagine delle danze e delle figure richiedono una sessione valida. I dati non sono inclusi nel bundle pubblico né memorizzati nella cache del service worker. Solo i dettagli testuali salvati esplicitamente dall'utente sono disponibili nella vista locale offline.
- Il contenuto pubblico è disattivato per impostazione predefinita. Imposta `VITE_FEATURE_PUBLIC_CONTENT=true` solo se vuoi consentire l'accesso ospite e hai configurato di conseguenza i permessi Appwrite; il deploy GitHub Pages forza il valore sicuro `false`.
- Registra i domini del sito come piattaforme Web in Appwrite (`localhost` per lo sviluppo).
- Se l'autenticazione è disattivata tramite feature flag, le pagine protette restano inaccessibili.

### Risorse e ruoli

- Database TablesDB: `dance`; tabella: `figures`.
- Colonne: `nome` (varchar 255, obbligatorio), `danza` (enum salsa/bachata, obbligatorio), `stili` (array varchar 64, obbligatorio), `youtubeId` (varchar 32), `videoFileId` e `imageFileId` (varchar 36).
- Bucket: `figure-media`, massimo **50.000.000 byte per file**. Video: MP4/WebM/MOV; immagini: JPG/JPEG/PNG/WebP.
- Catalogo `figures`: lettura `users`; **nessun permesso di scrittura client**, neppure alle label admin/superadmin. Le modifiche passano dalla Function `dance-library` (`service:"figures"`) con audit. Sicurezza per singola riga disattivata. Bucket: lettura `users`, upload/modifica/eliminazione per `label:admin` e `label:superadmin`, sicurezza per singolo file disattivata. Nessun accesso ospite.
- Gli utenti registrati hanno il ruolo base Appwrite `users`. Solo la Console o la Function `dance-user-management` (invocabile dai super admin) possono assegnare le label `admin` o `superadmin`; preferenze e form del browser non possono concedere privilegi. Un `superadmin` ha gli stessi diritti di modifica di un `admin`, più la gestione utenti.
- Gestione utenti tramite Appwrite Function `dance-user-management` (Node.js 22, entrypoint `main.js` in `functions/user-management`). Configura gli scope `users.read`, `users.write`, `rows.read`, `rows.write` per la chiave runtime della funzione e limita l'esecuzione alla label `superadmin`. La funzione elenca gli account e assegna/rimuove le label con audit durevole; vedi il setup admin per il deploy aggiornato. Non esporre chiavi API nel frontend o in variabili `VITE_*`.
- Il piano Free usa **solo due Function**: `dance-user-management` e `dance-library`. Quest'ultima gestisce pratica personale (`service:"practice"`) e figure/audit (`service:"figures"`), con autorizzazione server separata per ogni richiesta. Configurazione frontend: `VITE_APPWRITE_LIBRARY_FUNCTION_ID=dance-library`.
- L'autenticazione anonima è disattivata: serve registrarsi o accedere con un account.
- I JSON in [src/data/](src/data/) contengono solo i metadati pubblici delle danze e degli stili. Le 11 figure iniziali sono state migrate in Appwrite.

### Analytics

La tabella `figure_views` registra eventi solo per utenti autenticati. Mantieni i permessi di creazione per `users` e di lettura per `label:admin` e `label:superadmin`; le righe non sono leggibili dagli utenti normali. Le colonne sono `figureId` (varchar 36, facoltativa), `userId` (varchar 36, obbligatoria), `eventType` (enum facoltativo, default `figure_view`) e `eventTarget` (varchar 255, facoltativa).

Gli eventi includono visite alle pagine dell'app, aperture delle pagine figura, click sulle schede di danza/figura e sulla navigazione, oltre alle azioni admin riuscite (creazione/modifica figure e cambio ruolo). I record storici senza `eventType` continuano a contare come aperture figura. I click anonimi e gli avvii dei video YouTube esterni non vengono conteggiati.

Questi eventi browser sono telemetria, non una fonte attendibile per audit o autorizzazione. L'audit delle modifiche amministrative è scritto solo dal backend nella tabella dedicata.

### Aggiungere figure, immagini e video

Apri **Dashboard** per accedere alla pratica personale e al catalogo ricercabile. Gli amministratori trovano anche il riepilogo video e gli strumenti di gestione. Le sezioni sono nella navigazione laterale su desktop e nel menu **Sezioni dashboard** su mobile. L'account si apre dall'icona utente nella barra superiore, non dalla sidebar. Le sezioni sono collegabili direttamente con `?sezione=pratica`, `?sezione=catalogo` o `?sezione=account`.

Con un account con label `admin`, usa **Nuova figura** oppure il pulsante di modifica di una riga del catalogo. Nell'editor puoi scegliere gli stili e caricare video/immagine; in alternativa puoi inserire un ID YouTube di 11 caratteri. L'editor occupa lo schermo sui telefoni, chiede conferma prima di scartare modifiche non salvate e conserva i dati se il salvataggio fallisce. Gli altri utenti possono consultare il catalogo e aprire le figure, senza controlli di modifica.

I video Appwrite hanno la precedenza su YouTube. I caricamenti falliti prima del salvataggio della riga vengono rimossi; sostituire un file mantiene quello precedente nel bucket, senza eliminazioni distruttive automatiche.

Il player delle figure usa Video.js 10 (`@videojs/html` e `@videojs/youtube-video`) con controlli personalizzati in italiano: riproduzione/pausa, salti di 5 secondi, posizione con indicatore del buffer, audio, selettore velocità da 0,25x a 2x e schermo intero. Le etichette e gli annunci per screen reader usano le traduzioni Video.js. Con il focus nel player: Spazio/K riproduce o mette in pausa, M cambia l'audio, frecce sinistra/destra o J/L saltano di 5 secondi, F cambia lo schermo intero. Su mobile i controlli restano sotto il video, si adattano alla larghezza del player e i filmati verticali sono mostrati interamente, senza ritagli. Quando il browser non supporta lo schermo intero del contenitore, il player usa tutta la finestra per mantenere i controlli personalizzati.

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

## Pratica, ricerca e amministrazione

- **Dashboard → La mia pratica**: preferiti, liste personali e raccolte per progresso. Ogni figura permette di selezionare il segnalibro dei preferiti e salvare note private e uno dei progressi `learning`, `practicing`, `mastered`, oppure nessuno, con **Salva la mia pratica**.
- Ricerca per nome, **alias strutturati** e descrizione, senza distinzione di accenti/maiuscole. Per trovare `70` con `settanta`, inserire `settanta` tra i nomi alternativi nell'editor: non si deducono alias dai numeri.
- Danza/stile, video e difficoltà sono combinabili; ordinamento per nome naturale (2 prima di 10), difficoltà o aggiornamento. Le figure precedenti senza difficoltà restano valide e filtrabili come “Non indicata”.
- **Dettagli offline** nelle schede salva solo testo sul dispositivo; le copie sono accessibili da `/offline` anche senza rete. Nessun video o nota privata viene copiato. Browser storage non crittografato; logout/cambio account rimuovono le copie.
- Audit amministrativo separato dagli analytics e workflow JSON con anteprima/conferma per importazioni e modifiche massive.

**Setup obbligatorio prima del deploy frontend:** [pratica privata e offline](docs/APPWRITE_PRACTICE.md) e [audit, schema catalogo e Function admin](docs/APPWRITE_ADMIN.md). Le risorse Appwrite e le Function non vengono create o distribuite automaticamente dalla build del sito. Non mantenere i vecchi permessi di scrittura diretta del catalogo: le modifiche devono attraversare il backend di audit.

## Aspetto e navigazione

- Il selettore sole/luna nella barra superiore cambia tema con una transizione di 250 ms. Il tema iniziale segue il dispositivo; la scelta esplicita viene ricordata localmente (`dance-theme`) e sincronizzata tra le schede. Le animazioni rispettano `prefers-reduced-motion`.
- Colori di superfici, testi, controlli e stati sono definiti dai token in [src/style.css](src/style.css); anche i grafici amministrativi seguono il tema.
- Su mobile Home, Salsa, Bachata e Dashboard restano nella barra inferiore. Il pulsante **Nuova figura** appare solo nel catalogo degli amministratori.
- Il footer ha due colonne (impilate su mobile): identità e copyright a sinistra, LinkedIn/YouTube/GitHub e il contatto [dance@nimakarimi.me](mailto:dance@nimakarimi.me) a destra.
