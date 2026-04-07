# Wrestling Rundown Builder

This folder contains a single-file Next.js page (`app/page.tsx`) for Codex to inspect and repair.

## Notes
- The file assumes shadcn/ui components are available under `@/components/ui/*`.
- If your Codex environment does not already have those components, ask Codex to replace them with basic HTML or generate the missing UI files.
- The app stores data in `localStorage`.

## Suggested Codex prompt
Fix compile/runtime issues in this wrestling rundown builder while preserving current features:
- shows database in localStorage
- dynamic match sides by match type
- interference talent only when finish is Interference
- print tab with main event highlight
- talent music links with Google Drive download handling and YouTube open links
