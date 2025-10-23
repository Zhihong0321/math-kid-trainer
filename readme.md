# Math Kid Trainer

A playful multi-room HTML/CSS/JavaScript "math gym" created especially for ShuLaw. The lobby
lets you pick from themed training rooms so it is easy to grow the collection of games over
time.

## Rooms

### Math Tetris
Sprint to match the falling tile with ShuLaw’s target number before the countdown hits zero.
Select from three difficulty levels, earn streaks, enjoy confetti bursts, and learn from
coaching cues when a mistake slips through.

### Number Streak (preview)
A warm-up space outlining the next fast-paced streak challenge. The dedicated room gives a
sneak peek until the gameplay is ready.

## Run locally

1. Open `index.html` in any modern browser (everything is client-side).
2. Choose a training room from the lobby. Math Tetris lives at `rooms/math-tetris/` if you want
a direct link.
3. Play, experiment, and refresh to reset the session.

## Deploying

The site is still 100% static, but Railway expects a hint for how to serve the files. This
repo ships with:

* a [`Staticfile`](Staticfile) so Railpack recognises the Static buildpack
* a [`start.sh`](start.sh) helper that runs Python’s built-in web server on the port Railway provides

With those two files in place you can:

1. Create a new Railway project and choose **Static Site** (the buildpack will be auto-detected).
2. Deploy the repository as-is—Railway will execute `start.sh` which serves the lobby and `rooms/` directory.
3. Visit the generated URL and start training your young math heroes.

Any other static host (GitHub Pages, Netlify, Vercel, etc.) will work as well—just upload the
HTML, CSS, and JS files.

## Adding another training room

1. Create a new subdirectory inside `rooms/` (for example `rooms/new-room/`).
2. Add an `index.html` (and optional CSS/JS) for that room.
3. Update the lobby (`index.html`) with a card that links to the new folder.
4. Deploy or reload—the lobby automatically picks up the new room links.
