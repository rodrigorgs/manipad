# ManiPad

Contributors: see [Visão, referências e decisões](VISAO_E_DECISOES.md) (in Portuguese) for the project's direction, requirements, and decision rationale.

ManiPad is a tablet-friendly collaborative canvas for online tutoring. It combines freehand drawing, math manipulatives, two-sided chips, cards, dice, counters, pasted images, and pawns in temporary share-by-link rooms. Drawer objects can be tapped for collision-aware placement or dragged directly to a chosen board position.

## Private hands

Each participant can keep a hand of cards that only they can see, like holding cards at a real table.

1. Open **Things** and tap **My hand** (under *Tabletop*). A rectangle in your color, labeled *Your hand*, appears at the bottom of your view. You can drag it or resize it with the handles. Each person can have one hand.
2. Drag cards into it, or drag from a deck straight into it to draw a card into your hand. Cards in a hand are always face down: you see their faces (marked with 👁), everyone else sees the backs plus a count (*Leo's hand · 3 cards*).
3. To play a card, drag it out of your hand onto the table. It stays face down until you tap it to flip it.
4. Anyone can put a card into someone else's hand (to deal or give a card), but only the owner — or the tutor — can take cards out of it, move it, resize it or delete it. Cards in a hand do not stack.

**Dealing:** select a deck (tap the count under it) and tap **Deal…**, choose how many cards each hand gets, and **Deal**. Cards go out one per hand per round, from the top of the deck, to every hand on the board (also the hands of players who are away), face down and fanned out in each hand; dealing stops if the deck runs out, and one undo takes the whole deal back. When several people tap **My hand** with the same view, each new hand goes one row above the ones already there.

If the owner leaves, their hand stays on the board (*(away)*) and remains hidden; they see it again when they come back from the same browser. The tutor can delete it, or give an empty hand to someone else (select it, then *Give to*).

Privacy is enforced by the server, not just drawn: each participant receives their own snapshot, and the faces of cards in someone else's hand — as well as face-down cards and the order of every deck — are never sent to their browser. See `server/visibility.ts` and `server/permissions.ts`.

## Imported card decks (Naipe)

Card decks made in [Naipe](https://luccoelho.github.io/TCC/) can be brought to the board: open **Things** and tap **Import deck** (under *Tabletop*), then pick the `.json` file Naipe exports (there is a sample in `example/`). A face-down deck with all the cards appears, with the first card on top; it shuffles, deals, stacks and goes into hands like the regular deck.

Cards keep the proportions of the Naipe blueprint and show their fields in order: the first text as the title, then the art area, longer texts, and short values (e.g. *Custo 3 · Poder 2/4*) at the bottom. Images and icons are placeholders for now, because the export does not carry the image files.

## Decks from images

Any pictures can become a deck: open **Things** and tap **Deck from images**, then pick one or more image files. Each image becomes one card, in file-name order (*card 2* comes before *card 10*), with the first one on top of a face-down deck. Cards take the shape of the first image; the others are fitted inside it without cropping. Up to 60 images at a time; the browser shrinks them before sending. To try it, pick the fraction cards in `example/imagens/`.

## Dice

Tap **Die** under *Tabletop* for a classic six-sided die, or **Custom die** for one with 2 to 20 faces (d4, d6, d8, d10, d12, d20 are one tap away). A custom die can have its own color and, on each face, a short text (up to 12 characters) or a picture; faces left empty show their number.

- **Rolling:** double-tap a die, or select one or more dice and tap **Roll** (*Roll 3 dice* rolls them together, as one action). Under *Roll dice with*, each person can switch to rolling with a single tap; the choice is kept by their browser.
- **Fair rolls:** every value is drawn by the server, so everyone sees the same result and no one can pick it from their browser. A new or duplicated die also starts on a face drawn by the server.
- **Editing:** select a die and tap **Edit die**. Dice move, duplicate and delete like any other thing.
- Face pictures are shrunk by the browser and kept by the server, which sends only their address, like the pictures of image decks.

## Animations

Short animations (150–300 ms) make other people's moves easy to follow: a card drawn from a deck flies out of it, cards and decks turning over open up from edge-on, a shuffled deck shakes, a rolled die tumbles, and things moved by someone else glide to their new place instead of jumping. Your own drags are not replayed.

They only show a change: the board state never waits for them, and they always end exactly where the server's state says. Nothing animates when your system asks for reduced motion (`prefers-reduced-motion`), when many things change at once (opening a board, a big undo), or when redrawing the board takes longer than a frame on your device (a crowded table on a slow tablet): then changes simply appear. See `src/boardAnimations.ts`.
=======
## Saving and opening boards

The tutor can keep a board for another session: **Board file** (top bar) → **Export board** downloads a `.json` file with everything on the table, including face-down cards, the order of every deck, hands, imported and image decks, and dice with their faces. Pictures go inside the file, so it does not depend on the room it came from.

**Board file** → **Import board…** opens a saved file in the current room. After a confirmation (*it replaces the board for everyone in this room*), everyone gets the new board at once and their views are fitted to it. Opening a board cannot be undone. Hands keep their owners: whoever comes back from the same browser finds their hand again; the tutor can give the others away.

Only the tutor sees this menu: the file holds every hidden card, and opening one changes the board for everyone. Files from newer versions of ManiPad, damaged files and files over 45 MB are refused with a message, and the board stays as it was. The format is described in `src/shared/boardFile.ts`.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite client proxies API and Socket.IO traffic to the Node server on port 3000.

## Production

```bash
npm run build
npm start
```

The production server serves both the compiled client and realtime API on `PORT` (default `3000`). A single-process Dockerfile is included for Render, Railway, or Fly.io. Rooms are intentionally stored in memory and expire 30 minutes after the last participant leaves.

## Verification

```bash
npm test
npx playwright install chromium webkit
npm run test:e2e
```

The server is authoritative for room permissions, revisions, card shuffles, card draws, and dice rolls. Socket payloads are validated with Zod before mutations are applied. Snapshots are filtered per participant so hidden card faces never leave the server; a participant's id is tied to a secret kept in their browser, so nobody can join as someone else to see their hand.
