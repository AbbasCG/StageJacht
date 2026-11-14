# Stagejacht lokaal draaien (PostgreSQL)

Wat je nodig hebt: **Node.js 20 of nieuwer** en **Docker Desktop** (of een eigen PostgreSQL 14+).

## Stappen

1. **Database starten**
   ```
   docker compose up -d
   ```
   Dit maakt een PostgreSQL-database `stagejacht` en zet er meteen alle tabellen in (uit `db/schema.sql`).
   Zonder Docker: maak zelf een lege database en draai `npm run db:init` nadat je stap 2 en 3 hebt gedaan.

2. **Instellingen**
   ```
   cp .env.example .env.local
   npm run genkey            # plak de uitkomst bij TOKEN_ENCRYPTION_KEY
   ```
   Vul in `.env.local` minstens in: `ANTHROPIC_API_KEY` (voor de AI) en `TOKEN_ENCRYPTION_KEY`.
   `DATABASE_URL` staat al goed voor Docker.

3. **Starten**
   ```
   npm install
   npm run dev
   ```
   Open **http://localhost:3000**.

## Inloggen

- **Zonder Google (snelst):** in `.env.local` staan `DEV_LOGIN=1` en `NEXT_PUBLIC_DEV_LOGIN=1`. Op de inlogpagina verschijnt dan een kader "Testlogin". Typ een e-mailadres en je bent binnen. Zet dit **nooit** aan op een echte server.
- **Met Google (nodig voor Gmail):** maak in Google Cloud een OAuth-client (zie HANDLEIDING stap 3) met als redirect-adres `http://localhost:3000/auth/callback`, en vul `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` in.

## Wat waar staat

| Wat | Waar |
|---|---|
| Gebruikers, bedrijven, vacatures, profiel | PostgreSQL (`docker compose` bewaart ze in een volume) |
| Geüploade cv's | map `data/cv/` (of `UPLOAD_DIR`) |
| Gmail-toegang | versleuteld in de tabel `gmail_tokens` |

## Veelgebruikte commando's

```
psql postgresql://stagejacht:stagejacht@localhost:5432/stagejacht   # in de database kijken
docker compose down        # database stoppen (gegevens blijven bewaard)
docker compose down -v     # database stoppen én alles wissen
pg_dump postgresql://stagejacht:stagejacht@localhost:5432/stagejacht > back-up.sql
npm run cron:mail          # mail van alle gebruikers controleren (app moet draaien)
npm run cron:vacatures     # nieuwe vacatures zoeken
```

## Veiligheid in het kort

- De browser praat nooit rechtstreeks met de database. Alles gaat via `app/api/db/route.js`; die bepaalt aan de hand van je sessie-cookie wie je bent en geeft je alleen je eigen rijen.
- Abonnement, Gmail-status en Mollie-gegevens kun je niet vanuit de browser wijzigen.
- Het sessie-cookie staat als sha256 in de database, niet in leesbare vorm.
- Zie BEVEILIGING.md voor het hele overzicht en wat je online moet instellen.

## Als iets niet werkt

- *"DATABASE_URL ontbreekt"*: `.env.local` bestaat niet of staat niet in de projectmap.
- *"ECONNREFUSED 5432"*: de database draait niet. Start `docker compose up -d`.
- *Google zegt "redirect_uri_mismatch"*: het adres in Google Cloud moet precies `http://localhost:3000/auth/callback` zijn.
- *Gmail koppelen mislukt*: Gmail werkt alleen met echte Google-inloggegevens, niet met de testlogin.
