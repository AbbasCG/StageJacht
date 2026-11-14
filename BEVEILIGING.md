# Beveiliging van Stagejacht

Dit is wat er beschermd is en wat jij zelf moet doen als je het online zet.

## Wat de code doet

| Risico | Maatregel |
|---|---|
| Iemand ziet de gegevens van een ander | De browser praat alleen met `/api/db`. De server bepaalt uit je sessie wie je bent en voegt altijd `eigenaar = jij` toe. Per tabel is vastgelegd welke velden gewijzigd mogen worden. |
| Abonnement, Gmail-status of Mollie-gegevens aanpassen | Die velden kunnen alleen door de server gewijzigd worden, nooit vanuit de browser. |
| SQL-injectie | Alleen parameters (`$1, $2…`). Tabel- en kolomnamen worden gecontroleerd tegen een vaste lijst. |
| Sessie stelen uit een gelekte database | Het cookie is een willekeurig token; in de database staat alleen de sha256. Cookie is `HttpOnly`, `SameSite=Lax` en `Secure` op https. Maximaal 10 sessies per gebruiker, 30 dagen geldig. |
| Andere website laat jouw browser iets doen (CSRF) | Elk verzoek dat iets wijzigt moet een `Origin` van de eigen site hebben. Dat wordt twee keer gecontroleerd (middleware en in de route zelf). |
| Inloggen met iemand anders zijn account | Google moet het e-mailadres bevestigd hebben, de OAuth-`state` wordt tijdveilig vergeleken, een account hoort bij één Google-identiteit. |
| Gmail als spamkanon gebruiken | Maximaal 15 mails per uur en 40 per dag per gebruiker. Alleen één geldig adres per mail (geen komma's of extra regels). |
| Kwaadaardige mailkoppen (header-injectie) | Regeleinden worden uit onderwerp, adres en bestandsnamen gehaald; bijlagetypes zijn beperkt tot pdf, Word, png en jpg en worden aan de eerste bytes gecontroleerd. |
| Nep-cv of zip-bom uploaden | Het bestand moet echt een PDF of docx zijn; bij docx wordt de uitgepakte grootte vooraf gecontroleerd. Bestanden staan onder een vaste naam in een eigen map en worden nooit rechtstreeks door de webserver uitgedeeld. |
| De server laten rondneuzen op je netwerk (SSRF) | Pagina's van het web worden alleen opgehaald na een controle dat het adres openbaar is (geen localhost, 10.x, 192.168.x, 169.254.x, enz.), ook bij omleidingen; met tijd- en groottelimiet. Stagemarkt-links mogen alleen naar stagemarkt.nl wijzen. |
| Valse betaalmelding | De webhook vertrouwt alleen wat Mollie zelf teruggeeft, controleert bedrag en klant, en verwerkt een betaling maar één keer. |
| XSS | Content-Security-Policy (alleen eigen scripts), links uit data worden alleen getoond als ze met http(s) beginnen, React escapet alle tekst. |
| Vastklikken op een andere site (clickjacking) | `frame-ancestors 'none'`, `X-Frame-Options: DENY`. |
| Persoonlijke gegevens in een cache | `Cache-Control: no-store` op `/api`, `/auth` en `/app`. De service worker slaat die nooit op. |
| Gmail-tokens stelen | Versleuteld met AES-256-GCM (sleutel staat alleen in `.env.local`). |
| Misbruik van AI-kosten | Maandlimiet per abonnement, in de database afgedwongen. Uploads en database-aanroepen hebben een rate limit. |
| Cron-endpoints raden | Geheim van minimaal 16 tekens, tijdveilig vergeleken. |

## Wat jij moet doen

1. **Online zetten: alleen via https** en zet `NEXT_PUBLIC_SITE_URL=https://jouwdomein.nl`. Daardoor krijgt het cookie `Secure`.
2. **Zet `DEV_LOGIN` en `NEXT_PUBLIC_DEV_LOGIN` uit (verwijderen of `0`)** op een echte server. De code weigert het ook buiten localhost, maar dat is een vangnet.
3. **Verander het database-wachtwoord.** `stagejacht/stagejacht` is alleen voor op je eigen computer. Online: een lang willekeurig wachtwoord, de database niet openstellen naar internet.
4. **Maak sterke geheimen:** `npm run genkey` voor `TOKEN_ENCRYPTION_KEY`, en een lange willekeurige `CRON_SECRET` (minimaal 16 tekens; bijvoorbeeld `openssl rand -hex 32`).
5. **Bewaar `.env.local` nooit in git** en deel het niet. Staat er toch ooit een sleutel online, maak dan nieuwe aan (Google, Anthropic, Mollie, `TOKEN_ENCRYPTION_KEY`).
6. **Houd pakketten bij:** draai af en toe `npm audit` en `npm update`. Next.js wordt in `package.json` met `^14.2.30` gevolgd, zodat je bij `npm install` de nieuwste 14.2.x krijgt.
7. **Back-ups:** `pg_dump` regelmatig, en bewaar ze versleuteld.
8. **Meerdere servers tegelijk?** De rate limits staan in het geheugen van één server. Bij meer servers: verplaats ze naar Redis of de database.

## Bekende beperkingen

- De AI leest e-mails en webpagina's van derden. Die kunnen proberen de AI te sturen ("prompt injection"). Daarom stuurt Stagejacht nooit automatisch: de gebruiker leest en keurt elke mail zelf goed, en AI-uitvoer wordt als tekst behandeld.
- Er is geen tweestapsverificatie in Stagejacht zelf; die hangt aan het Google-account van de gebruiker.
