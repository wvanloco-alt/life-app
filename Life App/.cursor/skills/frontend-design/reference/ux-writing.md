# UX Writing

## Button Labels

**Never use "OK", "Submit", or "Yes/No".** Use verb + object:

| Bad | Good |
|-----|------|
| OK | Save changes |
| Submit | Create account |
| Yes | Delete message |
| Cancel | Keep editing |

For destructive actions, name the destruction: "Delete 5 items" not "Delete selected".

## Error Messages

Answer: (1) What happened? (2) Why? (3) How to fix it?

| Situation | Template |
|-----------|----------|
| Format error | "[Field] needs to be [format]. Example: [example]" |
| Missing required | "Please enter [what's missing]" |
| Network error | "We couldn't reach [thing]. Check your connection." |
| Server error | "Something went wrong on our end. We're looking into it." |

**Don't blame the user.** "Please enter a date in MM/DD/YYYY format" not "You entered an invalid date".

## Empty States

Empty states are onboarding moments: acknowledge briefly, explain value, provide clear action.

## Voice vs Tone

Voice is consistent; tone adapts:

| Moment | Tone |
|--------|------|
| Success | Celebratory, brief |
| Error | Empathetic, helpful |
| Loading | Reassuring |
| Destructive | Serious, clear |

**Never use humor for errors.**

## Accessibility

- Link text must have standalone meaning
- Alt text describes information, not the image
- Icon buttons need `aria-label`

## Consistency

Pick one term and stick with it: Delete (not Remove/Trash), Settings (not Preferences/Options), Sign in (not Log in).

---

**Avoid**: Jargon. Blaming users. Vague errors. Varying terminology. Humor for errors.
