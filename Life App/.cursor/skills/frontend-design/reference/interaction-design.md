# Interaction Design

## The Eight Interactive States

| State | Visual Treatment |
|-------|------------------|
| **Default** | Base styling |
| **Hover** | Subtle lift, color shift |
| **Focus** | Visible ring (`:focus-visible`) |
| **Active** | Pressed in, darker |
| **Disabled** | Reduced opacity, no pointer |
| **Loading** | Spinner, skeleton |
| **Error** | Red border, icon, message |
| **Success** | Green check, confirmation |

## Focus Rings

Never `outline: none` without replacement. Use `:focus-visible`:

```css
button:focus { outline: none; }
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

## Form Design

- Placeholders aren't labels—always use visible `<label>` elements
- Validate on blur, not on every keystroke
- Place errors below fields with `aria-describedby`

## Loading States

- **Optimistic updates** for low-stakes actions
- **Skeleton screens > spinners**
- Show content progressively

## Modals

Use native `<dialog>` element with `showModal()` for focus trapping. Or use `inert` attribute on background content.

## Destructive Actions: Undo > Confirm

Undo is better than confirmation dialogs—users click through confirmations mindlessly.

## Keyboard Navigation

Use roving tabindex for component groups (tabs, menus). Provide skip links for keyboard users.

---

**Avoid**: Removing focus indicators. Using placeholder text as labels. Touch targets <44px. Generic error messages.
