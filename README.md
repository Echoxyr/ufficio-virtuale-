# Ufficio Virtuale - Chat Aziendale

Sistema di messaggistica interna per aziende, utilizzabile esclusivamente da iPad tramite browser senza installazioni locali.

## Caratteristiche

- **Autenticazione**: Accesso con handle aziendale (nessun numero di telefono)
- **Messaging**: Canali pubblici/privati, thread, messaggi diretti con CC
- **Allegati**: Upload e download sicuro di PDF, documenti Office, DWG, immagini
- **Ricerca**: Full-text su messaggi e allegati
- **Privacy**: Row Level Security, DLP integrato, retention automatica
- **Realtime**: Aggiornamenti istantanei tramite WebSocket

## Setup (Solo Browser - iPad)

### 1. Creare Repository GitHub

1. Accedere a [github.com](https://github.com) da iPad
1. Cliccare “New repository”
1. Nome: `ufficio-virtuale`
1. Spuntare “Add a README file”
1. Cliccare “Create repository”

### 2. Aggiungere File al Repository

1. Nella pagina del repository, cliccare “Add file” > “Create new file”
1. Copiare e incollare tutti i file di questo progetto uno per uno:
- Creare la struttura delle cartelle digitando `web/src/main.tsx` nel nome file
- Incollare il contenuto del file
- Cliccare “Commit new file”
- Ripetere per tutti i file

### 3. Configurare Supabase

1. Andare su [supabase.com](https://supabase.com) da iPad
1. Cliccare “New Project”
1. Scegliere organizzazione e nome progetto
1. Aspettare che il database sia pronto (2-3 minuti)

#### 3.1 Eseguire SQL Setup

1. Nel dashboard Supabase, andare su “SQL Editor”
1. Cliccare “New query”
1. Copiare e incollare il contenuto di `supabase/sql/01_schema.sql`
1. Cliccare “Run”
1. Ripetere per tutti i file SQL nell’ordine: 01, 02, 03, 04, 05

#### 3.2 Configurare Storage

1. Andare su “Storage”
1. Cliccare “Create a new bucket”
1. Nome: `attachments`
1. Pubblico: NO
1. Cliccare “Create bucket”

#### 3.3 Configurare Storage Policy

1. Nel bucket `attachments`, cliccare sui tre puntini
1. Cliccare “Manage policies”
1. Cliccare “New policy”
1. Selezionare template “Give users access to own folder”
1. Policy name: `Users can manage their own attachments`
1. Salvare

#### 3.4 Ottenere Chiavi API

1. Andare su “Settings” > “API”
1. Copiare:
- **Project URL** (es. `https://abc123.supabase.co`)
- **Anon public** key (chiave lunga che inizia con `eyJ...`)

### 4. Configurare Variabili di Ambiente

1. Nel repository GitHub, creare file `.env`
1. Copiare il contenuto di `.env.example`
1. Sostituire i valori con quelli di Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### 5. Collegare Hosting Gratuito

#### Opzione A: Hosting con Deploy da GitHub

1. Scegliere un hosting gratuito che supporta:
- Deploy automatico da repository GitHub
- Siti statici (HTML/JS/CSS)
- Variabili di ambiente
1. Collegare il repository `ufficio-virtuale`
1. Impostare cartella build: `web/dist`
1. Aggiungere le variabili di ambiente del punto 4

#### Opzione B: GitHub Actions + Hosting Generico

1. Nel repository, andare su “Settings” > “Secrets and variables” > “Actions”
1. Aggiungere i secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `HOSTING_TOKEN` (token del tuo hosting provider)
- `HOSTING_PROJECT` (ID progetto hosting)
1. Il workflow in `.github/workflows/deploy.yml` si attiverà automaticamente

### 6. Creare Utenti Demo

1. Nel dashboard Supabase, andare su “Authentication” > “Users”
1. Cliccare “Add user” per creare:
- **Email**: `mario.rossi@demo.local`
- **Password**: `demo123!`
- Salvare e copiare l’UUID generato
1. Ripetere per:
- **Email**: `anna.verdi@demo.local`
- **Password**: `demo123!`

#### 6.1 Aggiornare Seed Data

1. Tornare su “SQL Editor”
1. Modificare il file `04_seed.sql` sostituendo gli UUID placeholder con quelli reali:

```sql
-- Sostituire questi UUID con quelli reali da auth.users
INSERT INTO profiles (id, org_id, handle, display_name, role, department) VALUES 
('UUID-REALE-MARIO', '550e8400-e29b-41d4-a716-446655440000', 'mario.rossi', 'Mario Rossi', 'admin', 'IT'),
('UUID-REALE-ANNA', '550e8400-e29b-41d4-a716-446655440000', 'anna.verdi', 'Anna Verdi', 'user', 'Sales');
```

1. Eseguire il SQL aggiornato

## Test da iPad

### Test di Base

1. Aprire l’URL del sito deployato su iPad
1. Accedere con `mario.rossi` / `demo123!`
1. Creare un nuovo canale privato
1. Aggiungere `anna.verdi` al canale
1. Creare un thread e inviare un messaggio

### Test Allegati

1. Nel thread, allegare un PDF o immagine
1. Verificare upload e download tramite Signed URL
1. Testare anteprima file

### Test CC e Realtime

1. Aprire due schede: una per Mario, una per Anna
1. Mario invia messaggio con CC ad Anna
1. Verificare che Anna riceva notifica in tempo reale

### Test DLP

1. Provare a inviare un messaggio con IBAN: `IT60 X054 2811 1010 0000 0123 456`
1. Verificare blocco del messaggio
1. Provare con Codice Fiscale: `RSSMRA80A01H501X`
1. Verificare mascheramento automatico

### Test Ricerca

1. Usare la funzione “Cerca” nell’header
1. Cercare parole nei messaggi
1. Cercare allegati per nome o estensione

### Test Retention

1. In SQL Editor, impostare retention su canale demo:

```sql
UPDATE channels 
SET retention_days = 1 
WHERE name = 'private-demo';
```

1. Aspettare che il job notturno (03:00) elimini messaggi vecchi
1. O forzare con: `SELECT purge_expired_messages();`

## Architettura

- **Frontend**: React SPA con Tailwind CSS, ottimizzato per iPad
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy**: Hosting statico con GitHub Actions
- **Security**: Row Level Security, DLP triggers, retention automatica

## Funzionalità Core

### Autenticazione

- Login con handle aziendale (formato: nome.cognome)
- Email sintetica generata: `handle@org.local`
- Nessun numero di telefono richiesto

### Messaging

- **Canali**: Pubblici (visibili a tutti nell’org) e privati (solo membri)
- **Thread**: Conversazioni organizzate nei canali
- **DM**: Messaggi diretti tra utenti
- **CC**: Copia conoscenza aggiungibile anche dopo l’invio
- **Menzioni**: @handle per notificare utenti specifici

### Allegati

- Upload su Supabase Storage con metadati in database
- Download tramite Signed URL con scadenza (5-10 minuti)
- Supporto: PDF, DOC/DOCX, XLS/XLSX, DWG, immagini
- Limite: 10MB per file

### DLP (Data Loss Prevention)

- **Blocco IBAN**: Messaggio rifiutato se contiene codici IBAN
- **Mascheramento CF**: Codici Fiscali automaticamente oscurati
- **Estensibile**: Regex configurabili per altre policy

### Retention

- Impostabile per canale (giorni)
- Purge automatico notturno via pg_cron alle 03:00
- TTL opzionale per singoli messaggi

### Sicurezza

- **RLS**: Tutti i dati protetti da Row Level Security
- **Org Isolation**: Gli utenti vedono solo la propria organizzazione
- **Audit Log**: Tracciamento azioni principali
- **Signed URLs**: Accesso temporaneo sicuro agli allegati

## Limitazioni Attuali

- Un’organizzazione demo preconfigurata
- Nessuna gestione inviti (utenti creati da admin)
- Notifiche solo in-app (no email/push)
- UI basilare ottimizzata per funzionalità

## Sviluppi Futuri

- Multi-tenancy con domini personalizzati
- 2FA opzionale
- Notifiche email configrabili
- API per integrazioni esterne
- Temi personalizzabili
- Export dati GDPR compliant

## Supporto

Per problemi o domande:

1. Verificare console browser per errori JavaScript
1. Controllare logs in Supabase Dashboard
1. Verificare policy RLS se un utente non vede dati
1. Testare connessione database dal SQL Editor

## Licenza

MIT License - vedi file LICENSE per dettagli.
