# Color & Contrast

## Color Spaces: Use OKLCH

**Stop using HSL.** Use OKLCH—it's perceptually uniform, meaning equal steps in lightness *look* equal.

```css
--color-primary: oklch(60% 0.15 250);
--color-primary-light: oklch(85% 0.08 250);
--color-primary-dark: oklch(35% 0.12 250);
```

**Key insight**: As you move toward white or black, reduce chroma. High chroma at extreme lightness looks garish.

## Building Functional Palettes

### Tinted Neutrals

**Pure gray is dead.** Add a subtle hint of your brand hue to all neutrals:

```css
--gray-100: oklch(95% 0.01 60);  /* Hint of warmth */
--gray-900: oklch(15% 0.01 60);
```

### Palette Structure

| Role | Purpose |
|------|---------|
| **Primary** | Brand, CTAs, key actions (1 color, 3-5 shades) |
| **Neutral** | Text, backgrounds, borders (9-11 shade scale) |
| **Semantic** | Success, error, warning, info (4 colors, 2-3 shades each) |
| **Surface** | Cards, modals, overlays (2-3 elevation levels) |

### The 60-30-10 Rule

- **60%**: Neutral backgrounds, white space
- **30%**: Secondary colors—text, borders, inactive states
- **10%**: Accent—CTAs, highlights, focus states

## Contrast & Accessibility

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |

### Dangerous Combinations

- Light gray on white (#1 accessibility fail)
- **Gray text on colored backgrounds**—use a darker shade of the background color instead
- Red on green (color blindness)
- Blue on red (visual vibration)

### Never Use Pure Gray or Pure Black

Pure gray and pure black don't exist in nature. Even chroma of 0.005-0.01 is enough to feel natural.

## Dark Mode

Dark mode is NOT inverted light mode:

| Light Mode | Dark Mode |
|------------|-----------|
| Shadows for depth | Lighter surfaces for depth |
| Dark text on light | Light text, reduce font weight |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Dark gray (oklch 12-18%), never pure black |

---

**Avoid**: Relying on color alone to convey information. Using pure black for large areas. Skipping color blindness testing.
