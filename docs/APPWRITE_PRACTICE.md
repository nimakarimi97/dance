# Pratica personale e copie offline

## Setup Appwrite (manuale, prima del frontend)

Non eseguire migrazioni automatiche sulla produzione. Creare le seguenti tabelle nel database `dance` (oppure il database configurato). Attendere che colonne e indici siano disponibili prima di distribuire la Function.

Per **entrambe** le tabelle:

- Abilitare **Row Security**.
- Permessi a livello tabella: **nessuno**, inclusi `users`, `admin`, `superadmin` e `any`.
- Nessun permesso client di creazione, modifica o eliminazione. Non assegnare alle label amministrative l'accesso a queste tabelle.
- La Function scrive esclusivamente `read("user:<owner>")` sulle righe; nessun permesso di scrittura client. Anche un admin può accedere solo ai propri dati tramite l'app.
- Indice key su `owner` per le query di proprietà.

### `figure_practice`

| Colonna | Tipo | Obbligatoria |
|---|---|---|
| `owner` | varchar 36 | sì |
| `figureId` | varchar 36 | sì |
| `favorite` | boolean | sì |
| `progress` | enum `learning`, `practicing`, `mastered` | no, default null |
| `notes` | text, limite applicativo 10.000 caratteri | sì |

Nessuna relazione con cancellazione a cascata: cancellare una figura non deve eliminare le note personali. L'ID riga è un hash deterministico della coppia proprietario/figura: un solo record per utente e figura.

### `practice_lists`

| Colonna | Tipo | Obbligatoria |
|---|---|---|
| `owner` | varchar 36 | sì |
| `name` | varchar 100 | sì |
| `figureIds` | varchar 36, array | sì |

Massimo 200 figure univoche per lista. Nessun accesso condiviso alle liste.

### Function condivisa `dance-library`

- Runtime Node.js 22, entrypoint `functions/library/main.js`, comando build `npm ci --omit=dev`. Packaging con dipendenze alla radice dell'archivio: seguire [le istruzioni admin](APPWRITE_ADMIN.md#runtime-and-packaging), includendo i moduli practice e figure. Non distribuire una terza Function: `dance-library` e `dance-user-management` occupano i due slot del piano Free.
- Esecuzione consentita solo a `users` (mai `any`). Nessun dominio pubblico, webhook o trigger esterno che possa iniettare header di identità.
- Chiave runtime Appwrite con scope `users.read`, `rows.read`, `rows.write`. Non assegnare `users.write`. La chiave rimane esclusivamente sul server.
- Variabili server: `APPWRITE_DATABASE_ID=dance`, `APPWRITE_FIGURES_TABLE_ID=figures`, oltre a endpoint/project e chiave dinamica forniti dal runtime Appwrite. `APPWRITE_FUNCTION_API_KEY` è supportata come fallback server, mai come `VITE_*`.
- Il browser invoca tramite Functions SDK: Appwrite inserisce `x-appwrite-user-id`. La Function verifica l'account sul server, ignora `owner`/`userId` nel body e controlla la proprietà prima di modificare o eliminare una lista.
- Ogni richiesta personale include `service:"practice"`; il dispatcher rifiuta servizi mancanti/sconosciuti. La rotta figure verifica separatamente i privilegi amministrativi e non concede accesso alle note altrui.
- Per ID Function diversi impostare `VITE_APPWRITE_LIBRARY_FUNCTION_ID` nel frontend.

Non ci sono migrazioni dei dati personali esistenti: queste tabelle sono nuove. Nessuna nota entra nell'audit o negli analytics. Le operazioni sono su una sola riga; modifiche contemporanee della stessa nota/lista da più dispositivi seguono la politica **ultimo salvataggio riuscito**. Non modificare la stessa lista contemporaneamente da più dispositivi.

Nel progetto connesso `dance-salsa-bachata`, tabelle, indici e Function sono già
stati provisionati via MCP. Il test live con due account temporanei e sessioni
reali ha verificato salvataggio, isolamento tra utenti, permessi owner-only,
deduplicazione/eliminazione liste e rifiuto delle scritture dirette. Account,
sessioni e dati di verifica sono stati rimossi. Resta necessario pubblicare il
frontend di questo branch; la build non modifica automaticamente Appwrite.

## Utilizzo

La registrazione via email richiede nome e cognome e li salva come nome visualizzato dell'account Appwrite.

Nella scheda figura: preferito, progresso, note e aggiunta alle liste. **Salva la mia pratica** conferma il salvataggio remoto, senza ottimismo fuorviante. In **Profilo → La mia pratica** si trovano preferiti, raccolte per progresso e creazione/modifica/eliminazione liste. Le figure non più disponibili restano indicate nelle liste e sono rimovibili dall'editor senza perdere le altre voci.

Se il servizio non è ancora configurato, l'app mostra l'errore e permette di riprovare; non simula salvataggi locali riusciti.

## Offline e privacy

- **Salva dettagli offline** scarica una copia aggiornata, esplicitamente selezionata: nome, danza, stili, alias, descrizione, difficoltà e data di aggiornamento. **Nessun media, link video, nota, token, password o oggetto sessione** viene salvato dal nuovo archivio.
- La copia è in `localStorage`, chiave `dance.offline.v1`, con un proprietario per dispositivo/profilo browser. **Non è crittografata**. Non usare l'offline su dispositivi condivisi/non protetti.
- `/offline` è una vista locale separata: funziona anche al riavvio PWA senza rete e **non concede accesso** a catalogo, API, note o strumenti admin. L'identità locale non viene mai usata come autenticazione.
- Una verifica server positiva attiva il proprietario e cancella le copie del precedente account. Logout riuscito o sessione confermata scaduta (401) le eliminano; il cambio si propaga alle schede aperte tramite l'evento `storage`, invalidando la relativa vista autenticata. Errori di rete non eliminano le copie.
- Se non è possibile verificare la sessione, resta disponibile solo ciò che è già sul dispositivo. I permessi/revoche server **non possono essere verificati offline**. Proteggere il dispositivo e cancellare manualmente le copie quando necessario; logout remoto da un altro dispositivo non può cancellare dati su un dispositivo offline.
- La vista mostra la data della copia e consente aggiornamento o rimozione. Un aggiornamento fallito conserva la copia precedente e mostra l'errore; una figura eliminata non viene presentata come aggiornata. Non esiste sincronizzazione automatica o coda di scritture offline.
- Le note richiedono rete: una bozza non salvata resta in memoria durante l'errore, con avviso prima di abbandonare la pagina. **Non** è persistita offline; chiudere forzatamente il browser può perderla.
- Il service worker conserva solo shell e font. Nessuna route Appwrite autenticata viene aggiunta alla cache runtime; nessuna modifica alle ACL del catalogo per supportare offline.

## Verifica su ambiente di staging

1. Due utenti A/B più un admin: A salva nota/preferito/lista; B e admin non devono leggere righe A né via SDK diretto né passando ID/owner A alla Function.
2. Controllare che la creazione/modifica diretta via TablesDB sia negata a tutti i client.
3. A salva dettagli; attivare modalità aereo, riaprire PWA su `/offline` e verificare testo, senza video/note.
4. Riconnettere: aggiornare copia; provare errore di rete/figura eliminata e verificare conservazione della copia precedente.
5. Logout e login B: nessuna copia A, anche in un'altra scheda. Nessuna credenziale deve comparire nella chiave `dance.offline.v1`.
