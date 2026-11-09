# Tabs of Time

A small, account-free tab editor for the one-handed Classic Ocarina Controls in _The Legend of Zelda: Ocarina of Time_ on Nintendo Switch 2.

Tabs live entirely in the URL: `-` separates notes and `|` separates lines. Each note uses one play button (`A`, `B`, `X`, `Y`, or `R`), an optional half-step modifier (`L` or `Z` for ZL), and an optional whole-step pitch bend (`U` or `D`).

Songs can be saved to the browser's local storage. Shared URLs omit local song IDs, so editing a shared song creates an independent local copy. The static build includes a web app manifest and service worker for installation and basic offline use.

## Development

```sh
pnpm install
pnpm dev
```

Quality checks:

```sh
pnpm check
pnpm lint
pnpm test
pnpm build
```

The static build in `build/` is ready for Cloudflare Pages.

## Assets

- Official promotional artwork © Nintendo, sourced from Nintendo's official Ocarina of Time product page.
- Switch 2 input glyphs from [Kenney Input Prompts](https://kenney.nl/assets/input-prompts), licensed CC0.
- Hylia Serif distributed by [Zelda Universe](https://zeldauniverse.net/wp-content/uploads/2021/11/hylia-serif.zip).

This is an unofficial fan-made tool and is not affiliated with or endorsed by Nintendo.
