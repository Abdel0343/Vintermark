# Vintermark — A Peasant's Tale

Gotisk swipe-kort-rollespil i bordeaux, bygget i React.

## Kom i gang

```bash
npm install
npm run dev      # udviklingsserver på http://localhost:5173
npm run build    # produktionsbuild i dist/
```

## Struktur

- `src/Vintermark.jsx` — hele spillet (kort, kæder, figurer, UI, lyd)
- `src/images.js` — portrætter som indlejrede WebP-billeder (`IMG`)
- `src/main.jsx` — monterer spillet

Gemte spil, indstillinger og achievements bruger `window.storage`, når spillet kører
som Claude-artifact, og ellers `localStorage` i browseren.
