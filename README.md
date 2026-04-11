# Google Search Language Switcher

Small local Chrome extension that forces Google searches toward your preferred interface and results language.

## What it does

- Forces Google Search UI language with `hl`.
- Forces search-result language with `lr=lang_<code>`.
- Applies a region bias with `gl`.
- Rewrites matching search URLs before the page settles.
- Injects the same settings into Google search forms.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:
   `/Users/nourashoush/Desktop/results-in-english`
5. Open the extension details page and turn on **Allow in Incognito**.

## Using the picker

Click the extension icon and set:

- Interface language: examples `auto`, `en`, `fr`, `ja`
- Results language: examples `en`, `fr`, `ja`, or `any`
- Region bias: examples `us`, `gb`, `jp`, or `auto`

The popup saves your settings and reloads the active tab.

`Reset` now restores a true pass-through mode: `auto` interface language, `any` results language, and `auto` region bias.

## Notes

- This only runs locally in your browser. You do not need to publish it.
- The extension currently injects on all pages and exits immediately unless the hostname is a Google domain. That makes it work across Google country domains, but if you publish it, you may want a tighter host-permission strategy for Web Store review.
- Earlier builds used prompt auto-clicking, but that can interact badly with Google’s changing UI. The current version sticks to safer URL and form parameter enforcement only.
