# bosun.sh Design Guide

This site uses a dark, technical editorial style for AI-native infrastructure. It should feel like a precise operating console, not a generic SaaS landing page.

## Principles

- **Systems first.** Present bosun as infrastructure: loops, specs, agents, guardrails, products, and teams.
- **Sparse and deliberate.** Use fewer elements with strong spacing, sharp hierarchy, and clear section boundaries.
- **Technical, not decorative.** Terminal motifs, mono labels, charts, diagrams, and dot grids are preferred over illustrations or marketing flourishes.
- **Human command, agent execution.** Copy and UI should reinforce the idea that humans define intent and systems execute.
- **Lowercase by default.** Most marketing headlines and navigation labels use lowercase. Preserve proper nouns where needed.

## Tokens

The source of truth is `app/globals.css`.

### Color

Use the existing CSS variables and Tailwind theme colors:

- `background`: near-black page background.
- `foreground`: primary body text.
- `heading`: softened white for major headings.
- `muted-foreground`: subdued blue-gray for supporting text.
- `card`: dark panel surface.
- `secondary`: darker blue-black control or icon surface.
- `border`: cool blue-gray dividers and panel outlines.
- `accent`: cyan highlight for actions, mono labels, active states, icons, and chart emphasis.
- `accent-glow`: low-opacity cyan glow for emphasis shadows and radial backgrounds.

Avoid introducing new dominant hues. The page should stay mostly black, off-white, blue-gray, and cyan, with very limited warning/destructive color usage.

### Typography

- Sans: `Space Grotesk`.
- Mono: `Space Mono`.
- Body default: `font-sans antialiased`.
- Use `font-bold tracking-tight` for headings.
- Use `font-mono text-xs uppercase tracking-widest` or `tracking-[0.18em]` for labels, metadata, stage markers, and counters.
- Avoid negative letter spacing beyond Tailwind `tracking-tight`.

Common hierarchy:

- Hero H1: `text-4xl sm:text-5xl lg:text-6xl xl:text-7xl`.
- Section H2: `text-3xl sm:text-4xl lg:text-5xl`.
- Card H3: `text-xl sm:text-2xl` or tighter if the panel is compact.
- Body: `text-sm` to `text-lg` with `leading-relaxed`.

### Radius, Borders, Shadows

- Prefer `rounded-sm` for brand surfaces, cards, buttons, icon cells, terminal blocks, and social buttons.
- Use `border border-border` for framed content.
- Use subtle transparent surfaces: `bg-card/70`, `bg-card/80`, `bg-secondary/50`.
- Use glow sparingly: `shadow-[0_0_60px_-34px_var(--accent-glow)]` for cards, `shadow-[0_0_40px_-8px_var(--accent-glow)]` for primary CTAs.

## Layout

- Page shell: `min-h-screen bg-background overflow-x-clip`.
- Main content width: `mx-auto max-w-6xl px-6`.
- Article content width: `max-w-4xl`, with body content around `max-w-3xl`.
- Major sections: `relative py-32 overflow-x-clip`.
- Header offset pages with `pt-32 sm:pt-36`.
- Separate major sections with a bottom `h-px bg-border` divider.
- Prefer full-width sections with constrained inner content. Do not nest cards inside cards.
- Use centered section headers for top-level marketing sections, generally `max-w-3xl mx-auto mb-16` or `mb-20`.

## Backgrounds

Use the `dot-grid` utility for technical texture:

```tsx
<div
  className="pointer-events-none absolute inset-0 dot-grid"
  style={{
    "--dot-size": "30px",
    "--dot-opacity": "0.2",
  } as React.CSSProperties}
/>
```

Guidelines:

- Keep dot grids low contrast: opacity usually `0.18` to `0.45`.
- Use 24px dots for dense technical sections, 28-32px for larger page backgrounds.
- Radial cyan glow is acceptable for CTA emphasis, but keep it transparent at the edges.
- Do not add gradient blobs, decorative orbs, or unrelated background illustrations.

## Components

### Header

- Fixed, 64px tall, blurred, and translucent.
- Use `border-border/20` before scroll and `border-border/40 bg-background/85` after scroll.
- Brand lockup is logo plus `bosun.sh`.
- Navigation labels are lowercase and muted until hover.
- Primary nav CTA uses accent background, mono bold text, and `rounded-sm`.

### Hero

- Full viewport minimum height with content centered vertically.
- Use a two-column desktop grid: text first, logo/interactive visual second.
- Keep hero copy short:
  - mono resource link,
  - direct H1,
  - one supporting sentence,
  - terminal command block,
  - secondary docs link.
- Terminal command blocks use `font-mono`, `bg-card`, `border-border`, muted `$`, and heading-colored command text.

### Section Headers

Use a consistent stack:

```tsx
<span className="font-mono text-xs uppercase tracking-widest text-accent mb-6 block">
  philosophy - 001
</span>
<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-heading text-balance">
  execution -> ownership
</h2>
<p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
  Short supporting copy.
</p>
```

Use ASCII arrows (`->`) in new source text unless the surrounding file already uses symbolic arrows.

### Cards And Panels

- Use cards for repeated items, dossiers, resources, and terminal-like panels.
- Default card shape: `rounded-sm border border-border bg-card/70 p-6`.
- Hover states should be restrained: `hover:border-accent/50`, small translate, or subtle glow.
- Do not use cards as generic page section wrappers.
- Keep card copy compact and scannable.

### Buttons And Links

- Primary CTA: accent background, accent foreground, mono bold, `rounded-sm`, icon on the right when directional.
- Secondary links: mono text, muted by default, accent on hover.
- Use lucide icons for actions and directional affordances.
- Icon-only controls should be square, stable size, and have accessible labels.

### Terminal Motifs

Use terminal treatments for commands, product inventory, and typed interactions.

- Always use `font-mono`.
- Prefix commands with muted `$`.
- Keep command text in `text-heading`.
- Use accent for cursor, active status, and command output emphasis.
- Terminal blocks should be compact, not oversized decorative containers.

### Charts And Scrollytelling

- Charts should feel like operational diagrams, not presentation graphics.
- Use cyan as the active/current path and muted blue-gray for inactive paths.
- Pair diagrams with mono labels such as `the loop`, `engineer time allocation`, or `the stack`.
- Scrollytelling stages use numbered mono markers, small icon boxes, uppercase labels, and concise stage descriptions.

### Resource And Article Pages

- Keep the same header, footer, dot-grid background, and dark surface language.
- Resource cards should use mono category/meta rows, strong titles, muted descriptions, and accent CTA links.
- Article headers use a large title, short description, and mono metadata row.
- Article CTA footers use the standard card treatment and a single accent link.

## Copy Style

- Prefer short declarative sentences.
- Use words like `spec`, `agent`, `loop`, `harness`, `guardrails`, `execution`, `intent`, `fleet`, `module`, and `team`.
- Avoid generic SaaS language such as "unlock productivity", "supercharge", "seamless", or "all-in-one".
- Headlines can be fragmentary: `the harness for autonomy`, `the fleet.`, `join the first wave.`
- Body copy should explain the operating model, not hype the product.
- Mono eyebrows should identify the section and sequence: `products - 003`, `field notes`, `resource library`.

## Motion

- Use existing reveal utilities and animations: `animate-slide-up`, `animate-fade-in`, `animate-scale-in`, and `Reveal`.
- Keep durations short: roughly 0.3s to 0.5s for UI reveals.
- Stagger only when it clarifies scan order.
- Always respect `prefers-reduced-motion`; existing global CSS already disables the custom animations.

## Accessibility

- Preserve semantic landmarks: `header`, `main`, `section`, `article`, `footer`.
- Icon-only buttons need `aria-label`.
- Do not rely on accent color alone for critical state.
- Keep text contrast high: headings on `text-heading`, body on `text-muted-foreground` only when secondary.
- Ensure mobile menus, cards, and terminal blocks fit within `px-6` layouts without horizontal overflow.

## Do And Do Not

Do:

- Use `max-w-6xl px-6` for most page sections.
- Use `rounded-sm` and `border-border` for brand surfaces.
- Use mono labels for structure and metadata.
- Use cyan accent for action, active, and system-state emphasis.
- Use concise copy and visible information architecture.

Do not:

- Introduce large decorative gradients, blobs, or stock imagery.
- Make marketing-style hero cards or split card/media hero compositions.
- Add large-radius cards unless an existing UI component requires it.
- Use bright multi-color palettes or heavy shadows.
- Add verbose instructional text inside the UI.
- Wrap full sections in cards or nest cards inside other cards.
