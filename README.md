# Stagejacht

Website en app (PWA) voor mbo-studenten om sneller een stageplek te vinden.

- Bedrijven bijhouden met status en opvolgdatum
- AI schrijft sollicitatiemails en antwoorden op basis van profiel en cv; de gebruiker controleert alles voordat het via Gmail verstuurd wordt
- Gmail checken op reacties, met advies (positief / negatief / neutraal)
- Passende vacatures van Stagemarkt
- Cv uploaden, AI-advies met cijfer, cv-editor en PDF
- Abonnementen Gratis / Pro / Premium via Mollie

**Techniek:** Next.js 14 (App Router, JavaScript), PostgreSQL (met `pg`), eigen Google-login met sessie-cookies, cv-bestanden op schijf, Anthropic API, Gmail API, Mollie.

**Online zetten:** zie [HANDLEIDING.md](./HANDLEIDING.md).

**Beveiliging:** zie [BEVEILIGING.md](./BEVEILIGING.md).

## Lokaal starten

Zie [LOKAAL.md](./LOKAAL.md) voor de stappen om alles op je eigen computer te draaien.

```
docker compose up -d         # PostgreSQL met het schema
cp .env.example .env.local   # en invullen
npm install
npm run dev                  # http://localhost:3000
```

## Mappen

- `app/` – pagina's en API-routes (`app/api/...`)
- `components/` – schermen van de app
- `lib/` – gedeelde code: AI, Gmail, Mollie, Stagemarkt, abonnementen
- `db/schema.sql` – database-schema (PostgreSQL)
- `scripts/` – database aanmaken en geplande taken lokaal draaien
- `public/` – app-iconen, manifest en service worker
