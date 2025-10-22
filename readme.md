# Math Kid Trainer

A playful HTML/CSS/JavaScript mini game that turns basic addition practice into a colorful “math gym” for kids. Numbers drop like a Tetris block, players choose the right power-up to land on the target number, and every correct answer explodes with confetti.

## How to play

1. Open `index.html` in any modern browser (the game is fully client-side).
2. Click **Start Training**.
3. A number block begins to fall from the top of the stage while a target number waits in the middle.
4. Tap the correct `+` option so the sum matches the target before the timer reaches zero.
   * If you nail it, the answer rockets upward, the stage glows, and cheerful confetti celebrates the win.
   * If time runs out or the wrong boost is selected, the stage rumbles and the correct equation is displayed so kids can learn from the miss.
5. Keep going to build streaks and chase a new personal best!

## Deploying

The site is still 100% static, but Railway expects a hint for how to serve the files. This repo ships with:

* a [`Staticfile`](Staticfile) so Railpack recognises the Static buildpack
* a [`start.sh`](start.sh) helper that runs Python’s built-in web server on the port Railway provides

With those two files in place you can:

1. Create a new Railway project and choose **Static Site** (the buildpack will be auto-detected).
2. Deploy the repository as-is—Railway will execute `start.sh` which serves `index.html`, `style.css`, and `game.js`.
3. Visit the generated URL and start training your young math heroes.

Any other static host (GitHub Pages, Netlify, Vercel, etc.) will work as well—just upload the HTML, CSS, and JS files.
