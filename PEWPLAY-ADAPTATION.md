# Tower of Hanoi for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`.

Game controls: Move the stack of disks to the destination peg, moving one disk at a time and never placing a larger disk on a smaller one.

## Second pass (quality update)
- Rewritten in plain JavaScript (jQuery and the dialog helper removed); no external fonts.
- Full-screen responsive board: disks and pegs are sized from the window in any orientation.
- Pointer Events: tap a peg to lift/drop, or drag a disk; keys 1/2/3, Esc, R.
- HUD with moves, minimum (127), stars and best score; in-page win and restart dialogs.
- Saves `Tower-of-Hanoi:best` and the puzzle in progress (`Tower-of-Hanoi:state`).
- New cover and screenshots.
