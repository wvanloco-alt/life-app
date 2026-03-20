# Spatial Design

## Spacing Systems

Use 4pt base: 4, 8, 12, 16, 24, 32, 48, 64, 96px. Name tokens semantically (`--space-sm`, `--space-lg`), not by value. Use `gap` instead of margins for sibling spacing.

## Grid Systems

Use `repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints. For complex layouts, use named grid areas and redefine at breakpoints.

## Visual Hierarchy

### The Squint Test

Blur your eyes. Can you still identify the most important element, the second, and clear groupings? If everything looks the same weight, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

| Tool | Strong | Weak |
|------|--------|------|
| **Size** | 3:1+ ratio | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | High contrast | Similar tones |
| **Position** | Top/left | Bottom/right |
| **Space** | Surrounded by whitespace | Crowded |

**Best hierarchy uses 2-3 dimensions at once.**

### Cards Are Not Required

Cards are overused. Use them only when content is truly distinct and actionable. **Never nest cards inside cards.**

## Container Queries

Use container queries for components, viewport queries for page layouts:

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { grid-template-columns: 120px 1fr; }
}
```

## Optical Adjustments

- Text at `margin-left: 0` looks indented—use negative margin to optically align
- Geometrically centered icons often look off-center
- Touch targets: 44px minimum, use padding or pseudo-elements to extend

## Depth & Elevation

Create semantic z-index scales. Shadows should be subtle—if you can clearly see it, it's probably too strong.

---

**Avoid**: Arbitrary spacing outside your scale. Making all spacing equal. Creating hierarchy through size alone.
