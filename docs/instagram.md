# Studio Instagram

Pagina privata `/admin/instagram` (solo profili con `role = 'admin'`), pensata per il telefono.
Crei caroselli da ricette pronte, dalle tue foto o da slide grafiche generate con i dati di Condoreco,
li pubblichi su @condoreco e, se vuoi, li sponsorizzi. Tutto è salvato in Supabase
(`ig_posts`, `ig_slides`, bucket `instagram`) e una copia arriva sul Mac e su Google Drive.

## 1. Account Instagram professionale (una volta)

1. App Instagram > Profilo @condoreco > Menu > Impostazioni > Tipo di account e strumenti > Passa a un account professionale > **Azienda**.
2. Categoria consigliata: "Sito web" o "Servizio immobiliare". Gratis, si può tornare indietro.
3. Per pubblicare **non** serve una Pagina Facebook. Serve solo per sponsorizzare (punto 4).

## 2. App Meta e token (una volta)

Le app Meta nuove usano **Unified login** con un token dell'utente di sistema (inizia con `EAA`, non scade).
Lo stesso token serve per pubblicare e, se ha `ads_management`, anche per sponsorizzare.

1. developers.facebook.com > app > Casi d'uso > "Gestisci i messaggi e i contenuti su Instagram" > Personalizza > **API setup with Unified login**.
2. Crea la configurazione: risorse = account Instagram @condoreco (+ account pubblicitario se c'è),
   autorizzazioni almeno `instagram_basic`, `instagram_content_publish`, `ads_management`, `ads_read`.
3. Business Manager > Impostazioni > Utenti di sistema: crea un utente di sistema Admin, assegnagli @condoreco
   (e l'account pubblicitario) e genera il token con quella configurazione. Copialo subito: si vede una volta sola.
4. Studio > Collega account: incolla il token e l'ID dell'account Instagram (Impostazioni business > Account Instagram).

Le app vecchie con "API setup with Instagram login" danno invece un token `IGAA`: funziona uguale, dura 60 giorni
e lo studio lo rinnova da solo.

## 3. Pubblicare

- **Ricette**: un clic genera copertina, consigli e chiusura con invito, più la didascalia con hashtag.
- **Le mie foto**: dal telefono, ridimensionate a 1080x1350 (4:5), JPEG, dati GPS rimossi.
- **Slide grafica**: copertina, consiglio numerato, numero grande, citazione, chiusura, e tre template con dati reali
  (classifica di zona, pagella condominio, pagella amministratore). Anteprima prima di aggiungere.
- Da 1 a 10 slide, didascalia max 2200 caratteri e 30 hashtag. "Pubblica" chiede conferma.

## 4. Sponsorizzare (opzionale)

Serve: Pagina Facebook collegata a @condoreco, account pubblicitario con metodo di pagamento, token con `ads_management`.

1. business.facebook.com > Impostazioni > Account > Pagine: crea o aggiungi la Pagina Condoreco e collega l'account Instagram.
2. Account pubblicitari: crea "Condoreco", valuta EUR, fuso Europe/Rome, aggiungi il metodo di pagamento.
3. Nell'app Meta del punto 2 aggiungi il prodotto **Marketing API**.
4. Impostazioni business > Utenti di sistema > Aggiungi (Admin) > assegna Pagina, account pubblicitario e app >
   Genera token con `ads_management`, `ads_read`, `pages_read_engagement`, `instagram_basic`.
5. Su Vercel (Settings > Environment Variables) aggiungi:

| Variabile | Valore |
| --- | --- |
| `META_ADS_ACCESS_TOKEN` | token dell'utente di sistema |
| `META_AD_ACCOUNT_ID` | `act_...` (Gestione inserzioni > ID account) |
| `META_PAGE_ID` | ID della Pagina Facebook |
| `META_IG_USER_ID` | opzionale, ID dell'account Instagram se diverso da quello dello studio |
| `META_DSA_BENEFICIARY` / `META_DSA_PAYOR` | opzionale, default "Condoreco" (obbligatorio per annunci in UE) |
| `META_SPECIAL_AD_CATEGORIES` | opzionale, es. `HOUSING` se Meta classifica gli annunci come immobiliari |

Dallo studio, su un post pubblicato: obiettivo, budget al giorno, giorni, città e raggio, età.
Campagna, gruppo inserzioni e inserzione vengono creati **in pausa**: non spendi nulla finché non li attivi
da Gestione inserzioni (il pulsante apre direttamente la campagna).

## 5. Copia su Mac e Google Drive

1. Installa Google Drive per desktop e accedi (crea `~/Library/CloudStorage/GoogleDrive-...`).
2. Dalla cartella del progetto: `bash scripts/install-instagram-sync.sh`
3. La prima volta crea `~/.condoreco-instagram-sync.env`: incolla la `service_role` key
   (Supabase > Project Settings > API keys) e rilancia lo script.
4. Se macOS chiede l'accesso di "node" a Google Drive, consenti.

Ogni 15 minuti:
- `~/Condoreco/Instagram/Studio/<data>_<titolo>_<id>/`: slide `01.jpg`, `02.jpg`..., `caption.txt`, `post.json`
- `~/Condoreco/Instagram/Pubblicati su Instagram/<data>_<id>/`: tutto quello che è sul profilo, anche i post fatti dall'app
- la stessa struttura in `Il mio Drive/Condoreco Instagram/`

Log: `~/Library/Logs/condoreco-instagram-sync.log`. Disinstallare: `bash scripts/install-instagram-sync.sh --uninstall`.

## Note tecniche

- Route: `/api/instagram/{account,preview,slides,publish,boost}`; tutte verificano sessione + `role = 'admin'`.
- Il token Instagram sta in `ig_credentials` (RLS senza policy) e si legge solo via RPC `ig_get_credentials()` che controlla `is_admin()`.
- Il bucket `instagram` è pubblico perché Instagram scarica le immagini dal loro URL; accetta solo JPEG fino a 8 MB.
- Slide generate con `next/og` (font Inter in `lib/instagram/fonts`, inclusi nel bundle via `outputFileTracingIncludes`) e convertite in JPEG con `sharp`.
