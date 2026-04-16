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
   `/Users/nourashoush/Desktop/language-switcher`
5. Open the extension details page and turn on **Allow in Incognito**.

## Using the picker

Click the extension icon and set:

- Interface language: examples `auto`, `en`, `fr`, `ja`
- Results language: examples `en`, `fr`, `ja`, or `any`
- Region bias: examples `us`, `gb`, `jp`, or `auto`

The popup saves your settings and reloads the active tab.

`Reset` now restores a true pass-through mode: `auto` interface language, `any` results language, and `auto` region bias.

## Presets

Open the popup and use **Manage presets** to open the full options page.

The options page lets you:

- save the current live settings as a named preset
- create presets manually
- edit or delete presets
- apply a preset without reloading the current tab

Applying a preset updates the saved extension settings immediately. Google picks those settings up on the next search or after a refresh.

## Locale check

To verify that every locale file includes the same message keys as English, run:

`node scripts/check-locales.mjs`

## Notes

- This only runs locally in your browser. You do not need to publish it.
- The extension currently injects on all pages and exits immediately unless the hostname is a Google domain. That makes it work across Google country domains, but if you publish it, you may want a tighter host-permission strategy for Web Store review.
- Earlier builds used prompt auto-clicking, but that can interact badly with Google’s changing UI. The current version sticks to safer URL and form parameter enforcement only.
