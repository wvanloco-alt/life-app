# Motion Design

## Duration: The 100/300/500 Rule

| Duration | Use Case |
|----------|----------|
| **100-150ms** | Instant feedback (button press, toggle) |
| **200-300ms** | State changes (menu, tooltip, hover) |
| **300-500ms** | Layout changes (accordion, modal, drawer) |
| **500-800ms** | Entrance animations (page load, reveals) |

**Exit animations are faster than entrances**—use ~75% of enter duration.

## Easing

**Don't use `ease`.** Instead:

| Curve | Use For | CSS |
|-------|---------|-----|
| **ease-out** | Entering | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **ease-in** | Leaving | `cubic-bezier(0.7, 0, 0.84, 0)` |
| **ease-in-out** | Toggles | `cubic-bezier(0.65, 0, 0.35, 1)` |

For micro-interactions use exponential curves:

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

**Avoid bounce and elastic curves.** They feel dated and amateurish.

## Animate Only transform and opacity

Everything else causes layout recalculation. For height animations, use `grid-template-rows: 0fr → 1fr`.

## Staggered Animations

Use CSS custom properties: `animation-delay: calc(var(--i, 0) * 50ms)`. Cap total stagger time.

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .card { animation: fade-in 200ms ease-out; }
}
```

Preserve functional animations (progress bars, spinners).

## Perceived Performance

- **80ms threshold**: Anything under feels instant
- **Optimistic UI**: Update immediately, sync later
- **Skeleton screens > spinners**

---

**Avoid**: Animating everything. Using >500ms for UI feedback. Ignoring `prefers-reduced-motion`.
