# Responsive Design

## Mobile-First

Start with base styles for mobile, use `min-width` queries to layer complexity.

## Breakpoints: Content-Driven

Let content tell you where to break. Three breakpoints usually suffice (640, 768, 1024px). Use `clamp()` for fluid values without breakpoints.

## Detect Input Method

```css
@media (pointer: fine) { .button { padding: 8px 16px; } }
@media (pointer: coarse) { .button { padding: 12px 20px; } }
@media (hover: hover) { .card:hover { transform: translateY(-2px); } }
```

**Don't rely on hover for functionality.**

## Safe Areas

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Responsive Images

Use `srcset` with width descriptors and `sizes`. Use `<picture>` for art direction (different crops per breakpoint).

## Layout Adaptation

- **Navigation**: hamburger on mobile → horizontal on tablet → full on desktop
- **Tables**: Transform to cards on mobile
- **Progressive disclosure**: Use `<details>/<summary>` for collapsible content

## Testing

DevTools emulation misses touch interactions, real CPU constraints, and font rendering. Test on real devices.

---

**Avoid**: Desktop-first design. Device detection instead of feature detection. Hiding critical functionality on mobile.
