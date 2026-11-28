- [X] The things in the "things to move" drawer should also be added to the whiteboard by dragging them
- [X] When adding a thing to the whiteboard by tapping it, if there is currently a thing in the whiteboard in the place where it would be inserted, it should be inserted with an offset
- [X] Allow to paste images from the clipboard onto the whiteboard
- [X] When selecting a thing in the whiteboard, the menu with possible actions that can be performed on the thing must appear close to the thing.
- [X] When double tapping a deck, a card must be drawn without being flipped.
- [X] When two cards are placed together, they should form a stack, just like the card deck.
- [X] Add a thing: chip (a circle that can have different colors and text on each side, double-tap to flip)


- [ ] When the drawing (pencil) tool is selected, dragging over an object should not dragging, it should draw behind the object instead.
- [ ] When the pencil is selected, users should be able to draw on top of a image by starting the gesture inside the image. The drawing in this case is not on the whiteboard, but on the image. When starting to draw outside the image and moving the finger to the image, the drawing will continue in the whiteboard, below the image.
- [ ] Improve card user interaction to match playingcards.io's behavior: dragging from a deck (or tapping it) draws a card. A single tap on a card flips the card. To drag the full deck, the user must drag the indicator of number of cards, which must be placed just outside the deck. Also, tapping the indicator selects the card and opens the action menu.


- [ ] Add a thing: grid, with variable number of rows and columns. The objects placed on top of the grid should snap to the grid's cells if their center is close enough to a cell's center. The grid can have cells of two colors, in a checkers pattern (a color can also be transparent to allow for cells with no fill).
- [X] Create a private area for each active user (implemented as private hands: a region on the board, see D-005 in VISAO_E_DECISOES.md, instead of a bottom drawer with a chest).



- [ ] Improve UI for editing chips
- [X] Deal cards from a deck to every hand, one round at a time (see D-013).
- [X] There should be animations for shuffling and rolling a die (and drawing, flipping, and moves by others; see D-012).
- [ ] Performance with a crowded table: each snapshot redraws the whole board (p95 120–150 ms per frame with 150 cards on the tablet profile), and the objects' blurred shadows are very costly when canvas is drawn without GPU. See D-012.
- [ ] Things need to allow for more customization than currently allowed. Fraction bars could be configured (colors, numerator, denominator); number tiles could have controls to increase/decrease number of even to type a number.
- [ ] Add a thing: dominoes
- [ ] Add a thing: cartesian plane
- [ ] Add a thing: number cards (square, stackable)

- [X] Save the whole board to a file and open it again (tutor only, see D-011).
- [X] Custom dice: 2 to 20 faces, text or picture faces, rolled by the server (see D-010).
- [X] Make a deck from image files, one card per image (see D-009 in VISAO_E_DECISOES.md).
- [X] Import card decks from Naipe (https://luccoelho.github.io/TCC/) JSON exports (see D-008 in VISAO_E_DECISOES.md; sample in `example/`).
- [ ] Naipe import: bring card images along. The export only has `image_path` (null in the sample); we need an export that embeds the files (or a zip) to show them.
- [ ] Naipe import: draw `icone` fields with their Material Symbols glyph (they show as ✦ for now), and use Naipe's card layout if a future export includes it.
- [ ] Card images are not yet supported; the snapshot still carries pasted images inline (data URLs), which is costly since the whole snapshot is resent on each change.
