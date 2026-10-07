# Treenipäiväkirja

Treenien kirjaus ja kehityksen seuranta: sarjojen painot ja toistot liikekohtaisesti sekä kehonpainon trendi.

## Käyttö

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # käytä puhelimella samasta wifistä
npm run build          # tuotantoversio dist/-kansioon
npm run julkaise       # build ja julkaisu GitHub Pagesiin (gh-pages-haara)
```

Julkaistu versio: https://lateepatee.github.io/treenit/

Tiedot tallennetaan selaimen localStorageen (vain kyseinen selain ja laite). Varmuuskopio JSON-tiedostona: Tiedot-välilehti.

## iPhone

Appi on PWA: avaa julkaistu osoite Safarissa → Jaa → Lisää Koti-valikkoon. Offline-tuki (service worker)
toimii vain HTTPS-osoitteessa. Kotivalikon appilla on eri localStorage kuin Safarilla; siirrä tiedot
varmuuskopiolla (Tiedot-välilehti).

## Rakenne

- `src/types.ts` – tietomalli (treenit, liikkeet, sarjat, punnitukset)
- `src/store.tsx` – tila ja tallennus
- `src/stats.ts` – trendilaskenta: arvioitu 1RM (Epley), volyymi, ennätykset, 7 pv liukuva keskiarvo
- `src/draft.ts` – keskeneräisen treenin automaattitallennus
- `src/views/` – näkymät (Koti, Treenit, Kehitys, Paino, Tiedot)
