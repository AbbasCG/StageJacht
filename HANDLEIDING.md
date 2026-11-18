# Stagejacht online zetten – handleiding

Deze handleiding brengt Stagejacht van deze code naar een echte website op je eigen domein, met abonnementen. Volg de stappen op volgorde. Reken op een paar avonden werk, plus wachttijd voor Google en Mollie.

> **Belangrijk:** deze code is geschreven maar nog niet getest met echte accounts. Test alles eerst in testmodus (stap 9) voordat echte gebruikers betalen.

---

## 0. Wat je nodig hebt

| Wat | Waarvoor | Kosten |
|---|---|---|
| GitHub | De code bewaren | Gratis |
| PostgreSQL | Database | Lokaal gratis (Docker). Online: een beheerde database of eigen server |
| Hetzner | Server (VPS) waar de website en de database op draaien | Vanaf ongeveer €4–5 per maand, afhankelijk van de server |
| Google Cloud | Inloggen met Google en Gmail | Gratis. Voor Gmail *lezen* is wel een jaarlijkse beveiligingskeuring nodig (zie stap 3) |
| Anthropic | De AI | Betalen per gebruik, ongeveer €0,01–0,05 per AI-actie |
| Mollie | Abonnementen en iDEAL | Geen vaste kosten, ongeveer €0,29–0,32 per betaling |
| Domeinnaam | Bijvoorbeeld stagejacht.nl | Ongeveer €10 per jaar |
| KvK | Nodig voor Mollie en om geld te ontvangen | €82,25 eenmalig |

Op je computer heb je **Node.js 20** nodig (nodejs.org) om lokaal te testen.

---

## 1. Code op GitHub zetten

1. Maak een account op github.com en een **privé** repository, bijvoorbeeld `stagejacht`.
2. Pak de zip uit en upload alle bestanden. Dat kan met *Add file → Upload files* of met GitHub Desktop.
3. Zet **nooit** een `.env`-bestand met echte sleutels op GitHub.

---

## 2. Database (PostgreSQL)

Stagejacht gebruikt **PostgreSQL**. Lokaal draai je hem met Docker; online kun je een beheerde database nemen
(bijvoorbeeld Neon of Supabase als gewone Postgres), of je draait hem op je eigen Hetzner-server.

**Lokaal (aanbevolen):**
1. Installeer Docker Desktop (docker.com).
2. Draai in de projectmap: `docker compose up -d`. De database `stagejacht` staat dan klaar op poort 5432 en het schema wordt meteen aangemaakt.
3. `DATABASE_URL` in `.env.local` is dan al goed: `postgresql://stagejacht:stagejacht@localhost:5432/stagejacht`.

**Zonder Docker:** installeer PostgreSQL 14 of nieuwer, maak een lege database en zet de verbinding in `DATABASE_URL`. Draai daarna `npm run db:init`
(of `psql "$DATABASE_URL" -f db/schema.sql`).

**Online (Hetzner):** draai PostgreSQL op de server zelf (bijvoorbeeld met `docker compose up -d`; poort 5432 luistert daarin alleen op `127.0.0.1`), of gebruik een beheerde database (EU-regio). Zet de verbindings-URL in `DATABASE_URL` en draai `npm run db:init`.
Cv-bestanden staan in de map `UPLOAD_DIR` op de server. Een Hetzner-server heeft een vaste schijf, dus die blijven bij een nieuwe versie bewaard.
Zet `UPLOAD_DIR` buiten de projectmap, zodat een `git pull` er niets aan verandert.

**Back-up:** `pg_dump "$DATABASE_URL" > back-up.sql`, en bewaar ook de map `UPLOAD_DIR`.

---

## 3. Google Cloud (inloggen en Gmail)

### 3a. Project en Gmail API
1. Ga naar console.cloud.google.com en maak een nieuw project "Stagejacht".
2. Ga naar **APIs & Services → Library**, zoek **Gmail API** en klik op **Enable**.

### 3b. OAuth-toestemmingsscherm
1. Ga naar **APIs & Services → OAuth consent screen** en kies **External**.
2. Vul in: app-naam "Stagejacht", supportmail, logo (`public/icons/icon-512.png`), je domein, en links naar `/privacy` en `/voorwaarden`.
3. Bij **Scopes** voeg je toe: `openid`, `email`, `profile`, `gmail.readonly` en `gmail.send`.
4. Bij **Test users** voeg je jezelf toe, en maximaal 100 testers.

### 3c. Inloggegevens
1. Ga naar **APIs & Services → Credentials → Create credentials → OAuth client ID** en kies **Web application**.
2. Authorized JavaScript origins: `https://www.jouwdomein.nl` en `http://localhost:3000`.
3. Authorized redirect URI: `http://localhost:3000/auth/callback` (lokaal) en `https://www.jouwdomein.nl/auth/callback` (online). Het moet precies kloppen.
4. Noteer de Client ID en het Secret als `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` in `.env.local`.

### 3d. Verificatie door Google (nodig voor iedereen, niet alleen testers)
Zolang je app in **Testing** staat, kunnen alleen je testgebruikers (max 100) inloggen, en moeten ze na 7 dagen opnieuw Gmail koppelen. Om de app voor iedereen open te zetten:
1. Verifieer je domein in **Google Search Console**.
2. Klik op **Publish app** en vraag **verificatie** aan. Google vraagt om:
   - een privacyverklaring op je domein (die zit in de code, maar laat hem controleren);
   - een uitleg waarom je elke scope nodig hebt;
   - een **demovideo** (YouTube, unlisted) waarin je laat zien hoe een gebruiker inlogt, Gmail koppelt en hoe Stagejacht mails leest en verstuurt.
3. Omdat `gmail.readonly` een **restricted scope** is, moet je app ook door een **CASA-beveiligingskeuring** bij een erkend bureau dat Google aanwijst. Dit is elk jaar opnieuw nodig. De kosten verschillen per bureau, van een paar honderd tot een paar duizend euro per jaar. Reken op enkele weken tot maanden.

**Tip voor de start:** lanceer eerst met maximaal 100 testgebruikers, bijvoorbeeld je klas en school. Zo test je of mensen willen betalen voordat je de keuring betaalt.

---

## 4. Anthropic (AI)

1. Ga naar console.anthropic.com, maak een account en een **API key** → `ANTHROPIC_API_KEY`.
2. Zet er tegoed op en stel bij **Limits** een maandlimiet in, zodat je nooit voor verrassingen staat.
3. Modellen staan in `.env` (`ANTHROPIC_MODEL` en `ANTHROPIC_MODEL_FAST`). Controleer de actuele modelnamen in de Anthropic-documentatie.

---

**Geen watermerk:** Stagejacht zet niets extra's in mails: geen "verstuurd met Stagejacht", geen handtekening van de app en geen verborgen tekens. Voor het versturen worden onzichtbare tekens (zoals zero-width spaces) zelfs actief weggehaald.

## 4b. Internet doorzoeken (optioneel)

Stagejacht zoekt standaard op Stagemarkt. Wil je dat hij **het hele internet** doorzoekt (vacaturesites, stagebanken, bedrijfswebsites), maak dan een sleutel aan bij de **Brave Search API** (brave.com/search/api). Er is een gratis variant met een beperkt aantal zoekopdrachten per maand. Zet de sleutel in `BRAVE_SEARCH_API_KEY`.
- Afstanden worden berekend met de gratis **PDOK Locatieserver** van de overheid. Daarvoor heb je geen sleutel nodig.
- Iedere gebruiker stelt bij Profiel zijn maximale reisafstand in (5 tot 40 km). Plekken die verder weg liggen worden niet getoond.
- Bij plekken van buiten Stagemarkt controleert Stagejacht of het bedrijf als **erkend leerbedrijf** op Stagemarkt staat. Een mbo-stage mag alleen bij een erkend leerbedrijf.
- Lees de voorwaarden van websites die je doorzoekt. Sommige sites verbieden automatisch uitlezen. Sla die dan over.

## 5. Mollie (betalen)

1. Maak een account op mollie.com. Je hebt een **KvK-nummer** en een zakelijke rekening nodig.
2. Activeer **iDEAL** en **SEPA-incasso**. Incasso is nodig voor de maandelijkse betalingen.
3. Neem de **test-API-key** (`test_...`) → `MOLLIE_API_KEY`. Pas na het testen gebruik je de `live_...`-key.
4. Een webhook instellen hoeft niet: de code geeft per betaling zelf het adres `https://jouwdomein.nl/api/billing/webhook` mee. Dit werkt alleen op een echte website, niet op localhost.

Prijzen en limieten pas je aan in `lib/plans.js`.

---

## 6. Sleutels in een `.env`-bestand

1. Kopieer `.env.example` naar `.env.local`.
2. Vul alles in.
3. Maak de versleutelsleutel aan met `npm run genkey` → `TOKEN_ENCRYPTION_KEY`.
4. Kies voor `CRON_SECRET` een lange willekeurige tekst.

---

## 7. Hetzner (website online)

1. Maak bij hetzner.com een Cloud-server (Ubuntu LTS, EU-locatie) en zet je SSH-sleutel erop. Installeer Node.js 20, Git en `pm2` (en Docker als je de database daarmee draait).
2. Haal de code op met `git clone https://github.com/AbbasCG/StageJacht.git` en kies de gewenste branch (`git checkout dev` of `main`). Maak `.env.local` op de server met alle regels uit stap 6. Gebruik voor `NEXT_PUBLIC_SITE_URL` je domein.
3. Bouw en start de site met `npm ci`, `npm run build` en `pm2 start npm --name stagejacht -- start`. Daarna `pm2 save` en `pm2 startup`, zodat hij na een herstart weer opstart.
   Zet er een reverse proxy voor (Nginx of Caddy) die `https://jouwdomein.nl` doorstuurt naar `localhost:3000`, met een gratis HTTPS-certificaat (Certbot of Caddy). Laat in de firewall alleen poort 22, 80 en 443 open.
   Nieuwe versie live zetten: `git pull`, `npm ci`, `npm run build`, `pm2 restart stagejacht`.
4. De geplande taken (mailcheck en vacatures zoeken) draaien niet vanzelf. Plan ze met `cron` op de server (`crontab -e`). Zet `CRON_SECRET` en `CRON_BASE_URL` (bijvoorbeeld `http://localhost:3000`) in `.env.local`:
   ```
   0 6 * * *   cd /pad/naar/stagejacht && npm run cron:vacatures
   30 7 * * *  cd /pad/naar/stagejacht && npm run cron:mail
   ```
   Je kunt ze zo vaak laten draaien als je wilt.

---

## 8. Je eigen domein

1. Koop een domein, bijvoorbeeld bij TransIP, Versio of Hostnet.
2. Zet bij je domeinbedrijf een **A-record** voor `@` en een **A-record** of **CNAME** voor `www` naar het IP-adres van je Hetzner-server.
3. Zet het domein in de configuratie van Nginx of Caddy en vraag het HTTPS-certificaat aan.
4. Werk daarna bij:
   - `NEXT_PUBLIC_SITE_URL` in `.env.local`, daarna `npm run build` en `pm2 restart stagejacht`;
   - Google: de JavaScript origins en de domeinen op het toestemmingsscherm.

---

## 9. Testen (doe dit allemaal in testmodus)

Lokaal:
```
npm install
npm run dev
```
Open http://localhost:3000.

Loop deze lijst na:
- [ ] Inloggen met Google, welkomststappen, Gmail koppelen (met een testgebruiker)
- [ ] Bedrijf toevoegen, bewerken, verwijderen. Bij Gratis kun je er niet meer dan 3 toevoegen
- [ ] Cv uploaden (PDF en Word), AI-advies, editor, PDF downloaden, "Gebruik dit cv voor mijn mails"
- [ ] AI-mail schrijven, nakijken en **naar jezelf** versturen, met cv-bijlage
- [ ] Reactie-check: stuur jezelf vanaf een ander adres een "afwijzing" en tik op Check mijn mail
- [ ] Abonnement afsluiten met een Mollie-testbetaling (op de live site, niet localhost) → plan wordt Pro
- [ ] Opzeggen → je houdt het plan tot het einde van de maand
- [ ] Gmail loskoppelen, account verwijderen
- [ ] Op je telefoon: **Toevoegen aan beginscherm**, dan opent de app zonder adresbalk

Gaat er iets mis, kijk dan in de logs op de server met `pm2 logs stagejacht`.

---

## 10. In de app stores (later)

De website is al een installeerbare app (PWA). Wil je in de stores:
- **Google Play**: verpak de PWA met **PWABuilder** (pwabuilder.com). Een ontwikkelaarsaccount kost $25 eenmalig.
- **Apple App Store**: kan ook via PWABuilder. Je hebt een Apple Developer-account nodig ($99 per jaar) en een Mac of een bouwdienst. Apple is strenger met apps die alleen een website zijn.

---

## 11. Zakelijk en juridisch

- **KvK**: inschrijven als eenmanszaak. Ben je jonger dan 18, dan heb je toestemming nodig van je ouders en meestal van de kantonrechter (*handlichting*). Vraag het na bij de KvK.
- **Btw**: kijk of de kleineondernemersregeling (KOR) iets voor je is. Vraag het na bij de Belastingdienst of een boekhouder.
- **Privacyverklaring en voorwaarden** staan als concept in `/privacy` en `/voorwaarden`. Vul de [haken] in en laat ze controleren, bijvoorbeeld via het Juridisch Loket.
- **Verwerkersovereenkomsten**: sluit of accepteer de DPA's van je databasebedrijf, je hosting, Anthropic en Mollie.
- **Stagemarkt**: vraag SBB of je hun openbare stagepagina's automatisch mag doorzoeken, of dat ze een koppeling (API) hebben. Zeggen ze nee, zet dan het automatisch zoeken uit en laat alleen de knop "Open Stagemarkt" staan.

---

## 12. Kosten en prijs: een rekenvoorbeeld

Een Pro-gebruiker gebruikt ongeveer 40 AI-acties en 30 dagelijkse mailchecks per maand. Dat kost je grofweg €0,50 tot €1,50 aan AI. Mollie rekent ongeveer €0,30 per betaling. Bij €3,99 per maand houd je dan ongeveer €2 tot €3 over per gebruiker. Daar gaan nog de vaste kosten van af, zoals de Hetzner-server en de CASA-keuring. Controleer de echte AI-kosten in de eerste maanden via de Anthropic-console.

---

## 13. Beveiliging in het kort

- Iedere gebruiker ziet alleen zijn eigen gegevens. Dat regelt Row Level Security in de database.
- Gebruikers kunnen hun eigen abonnement of Gmail-status niet aanpassen; dat kan alleen de server.
- Gmail-toegang wordt versleuteld opgeslagen (AES-256-GCM).
- Mails worden alleen verstuurd na een vinkje "gecontroleerd" en een tik op Versturen.
- Lekt er een sleutel uit, maak dan meteen een nieuwe aan bij de dienst en vervang hem in `.env.local` op de server en herstart met `pm2 restart stagejacht`.

## 14. Wat er nog bij kan

- Pushmeldingen op je telefoon. Nu krijg je een mail naar jezelf bij nieuwe reacties.
- Meer dan ~50 gebruikers per geplande taak: gebruik een wachtrij, zoals een wachtrij (bijvoorbeeld Upstash QStash.
- Een beheerpagina voor jou met het aantal gebruikers en abonnementen.
