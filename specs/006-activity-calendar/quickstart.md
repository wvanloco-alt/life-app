# Quickstart: Activity Calendar

**Feature**: `006-activity-calendar`
**Date**: 2026-10-04

Manual checks after implementation. Use two accounts for the privacy check.

1. Start the app and sign in. Open This Week, then Month. There is no third Calendar item. Today is distinct on both, using the Belgium calendar day. A fresh account shows Climbing in red and Running in blue with no setup step. Restart the server after changing a color and confirm the color stuck.
2. Check Climbing and Running for today. Each plays its own celebration, and the rows stay where they were. Leave the page and come back. Both are still checked. The day shows two colored icon sections, and the legend shows both icons and colors.
3. Check Climbing for today again. There is still one Climbing mark.
4. Open yesterday and check one activity. Today is unchanged.
5. Move to a future day. The list cannot be checked.
6. Filter to Climbing. Running marks disappear. Clear the filter. They return.
7. A day with nothing checked has no activity color and does not look like a missed day.
8. Hide Tennis. It leaves the list and the month. Show it again. Old Tennis marks return if any existed.
9. Change Running's color. Past running days use the new color.
10. Hide every activity. The calendar asks you to show at least one. It does not show an empty broken grid with no explanation.
11. Uncheck a calendar-only Climbing day. The mark disappears.
12. Log a detailed Running session, or sync Garmin, for a day. That day is checked and cannot be unchecked from the calendar. The detailed or imported session is still in Activities afterward. If you check first and Garmin imports the same activity afterward, two rows exist and the month still shows one mark. The checkbox stays locked. Uncheck removes the calendar row and leaves the Garmin row. History may show "Checked" beside the real workout until that calendar row is gone.
13. Disconnect Garmin (or use an account with no Garmin) and check two activities that have no distance. The dashboard week card's large number is 2, not a connect prompt. With nothing checked, it shows 0 and a link to This Week. If the week also has a run with distance, the large number is the kilometres and the count of 2 is the smaller line. Sleep and calories still ask for Garmin. The Activities list and This Week's completed-activity line say "Checked", not "0m".
14. Sign in as a second user. None of the first user's checks, colors, or hidden activities appear.
