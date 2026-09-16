# 8,000 Cups Kopi Tarik Challenge

Vue 3 + Phaser 3 + Matter.js physics game.

## Run
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
```
Upload the generated `dist/` directory to your web server.

## Gameplay
- Drag the curry puff backward from the slingshot.
- Release to launch.
- 80 destructible kopi cups.
- Each cup = 100 points.
- Maximum score = 8,000.
- Celebration triggers at 8,000.

Assets in `public/assets` were prepared from the visuals created/provided in this ChatGPT conversation.

## Cartoon artwork

The three supplied reference sheets are copied unchanged into `public/assets/cartoon/`:

- `slingshot-sheet.png`: wooden fork, red wraps, and grassy base.
- `puff-sheet.png`: front-facing curry puff projectile.
- `cup-sheet.png`: foamy cartoon cup with the original printed artwork.

`src/artwork.js` clips the sheet regions into cached textures once at startup. Sprites then move and rotate normally without per-frame stencil masks. Slingshot bands remain procedural so they stretch and recoil independently of the artwork. The landscape retains its original aspect ratio.

The slingshot uses a shared puff/band transform, frame-rate-independent drag smoothing, a 150 ms coupled release, and a short damped recoil. Small pulls ease back to rest.
