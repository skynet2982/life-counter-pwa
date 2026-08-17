# Life Counter PWA

A free and Open Source life counter for Magic: The Gathering, as an installable web app. Track your life points without being tracked!

This is the PWA port of the [Android Life Counter app](https://codeberg.org/skynet2982/life-counter) — same features, installable on iPhone (and anywhere else a browser runs).

Main features:
* Max compatibility, no tracking, no ads.
* Swipe up and down to quickly add or remove 5 life points.
* Add a timer to track your game duration.
* See life points history in side panes.
* To see full history with times you can long press on life points history.

📱 Open **https://skynet2982.github.io/life-counter-pwa/** on your phone (or scan the QR code below), then use your browser's "Add to Home Screen" option to install it.

<img src="screenshots/qr-code.png" alt="QR code linking to the Life Counter PWA" width="180">

## Development

The app lives entirely in [`web/`](web/) — plain HTML/CSS/JS, no build step, no dependencies.

To run it locally:

```sh
cd web
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Every push to `main` that touches `web/**` is automatically built and deployed to GitHub Pages by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## License

GNU AGPLv3 — see [LICENSE](LICENSE).
