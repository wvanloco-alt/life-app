# Feature Specification: Savings Redesign

**Spec ID**: `savings-redesign`
**Created**: 2026-03-21
**Status**: Draft

---

## Overview

The current savings tracking model is broken: it infers "savings" as whatever money was left over each month (income − fixed costs − spending). This means unspent monthly budget is wrongly counted as savings, even though that money hasn't been moved anywhere.

This feature replaces the inferred model with an explicit one: savings are only what you deliberately log. You log a transfer to your savings account as a "Savings" spending entry. You log a withdrawal as a "Savings Withdrawal" entry. You set a starting balance to capture what you already had before you started tracking. The savings goal then reflects reality.

---

## User Scenarios & Testing

### User Story 1 — Log a Savings Contribution (Priority: P1)

The user transfers €500 to their savings account. They open the Log Spending tab, select the "Savings" category, enter €500, and it immediately appears in their savings goal progress.

**Why this priority**: This is the core fix. Without it, savings tracking is meaningless.

**Independent Test**: Add a "Savings" spending entry. Check that the savings goal progress in the Budget Goals tab increases by the logged amount.

**Acceptance Scenarios**:

1. **Given** a "Savings" spending category exists, **When** the user logs a spending entry in that category, **Then** the amount is added to their total savings accumulated.
2. **Given** a savings goal is set, **When** a Savings entry is logged, **Then** the progress bar and percentage on both the Dashboard and Budget Goals tab update correctly.
3. **Given** a Savings entry is deleted, **When** the user refreshes, **Then** the savings total decreases by the deleted amount.

---

### User Story 2 — Set a Starting Savings Balance (Priority: P1)

The user already has €2,000 saved before they started using the app. They enter this as a starting balance in budget settings. The savings goal progress starts from €2,000, not zero.

**Why this priority**: Without this, anyone with pre-existing savings sees a misleadingly low savings figure and can't use the goal meaningfully.

**Independent Test**: Set starting balance to €2,000 with a goal of €5,000. Verify the progress bar shows 40% and "€2,000 saved" without any spending entries.

**Acceptance Scenarios**:

1. **Given** no prior savings entries, **When** the user sets a starting balance of €2,000, **Then** the savings total shows €2,000 and the goal progress updates accordingly.
2. **Given** a starting balance is set and Savings entries exist, **When** the dashboard loads, **Then** total savings = starting balance + sum of all Savings entries − sum of all Savings Withdrawal entries.
3. **Given** a starting balance of €0, **When** the user leaves it blank, **Then** the system treats it as €0 (no change in behaviour).

---

### User Story 3 — Log a Savings Withdrawal (Priority: P2)

The user had to dip into their savings for an emergency. They log it as a "Savings Withdrawal" spending entry. The amount is subtracted from their total accumulated savings.

**Why this priority**: Without withdrawals, the savings total is always optimistic and incorrect after any real-world dip.

**Independent Test**: Log €300 as a Savings Withdrawal. Verify total savings decreases by €300 and the goal progress reflects the reduction.

**Acceptance Scenarios**:

1. **Given** a "Savings Withdrawal" spending category exists, **When** the user logs an entry in that category, **Then** the amount is subtracted from their total savings accumulated.
2. **Given** accumulated savings of €3,000 and a withdrawal of €500, **When** the dashboard loads, **Then** total savings shows €2,500.
3. **Given** a withdrawal larger than current savings, **When** saved, **Then** total savings shows as €0 (floor at zero, no negative display).

---

### User Story 4 — Savings Goal Visible on Dashboard (Priority: P2)

The user opens the Budget tab and immediately sees their savings goal progress on the Dashboard — without having to navigate to the Budget Goals tab.

**Why this priority**: The goal is the most motivating data point in the budget. It should be front and centre, not buried.

**Independent Test**: Set a savings goal of €5,000 and log €1,500 in Savings entries. Open the Dashboard tab and verify the progress card is visible with correct figures.

**Acceptance Scenarios**:

1. **Given** a savings goal is configured, **When** the user opens the Budget Dashboard, **Then** a savings goal card is visible showing amount saved, goal total, percentage, and target date (if set).
2. **Given** no savings goal is configured, **When** the Dashboard loads, **Then** no savings goal card is shown (not an empty card).
3. **Given** the goal is 100% reached, **When** the Dashboard loads, **Then** the progress bar shows full and a completion indicator is displayed.

---

## Edge Cases

- What if the user deletes the "Savings" or "Savings Withdrawal" category? → These are default categories but not system-locked. If deleted, the savings calculation simply has no entries to sum — the starting balance still applies. The categories can be re-added manually.
- What if savings total (starting balance + entries − withdrawals) goes negative? → Display as €0. Never show negative savings.
- What if the user changes the starting balance after months of tracking? → The new value takes effect immediately. It's the user's responsibility to set an accurate number.
- What if a Savings entry is logged in a future month? → It is included in the total (savings accumulation is not month-scoped, it's a lifetime total).

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a "Savings" spending category (added to defaults) for logging savings contributions.
- **FR-002**: System MUST provide a "Savings Withdrawal" spending category for logging withdrawals from savings.
- **FR-003**: System MUST calculate total savings as: `starting balance + SUM(Savings entries) − SUM(Savings Withdrawal entries)`.
- **FR-004**: System MUST allow users to set a starting savings balance in budget settings.
- **FR-005**: System MUST display the savings goal progress card on the Budget Dashboard tab (in addition to the Budget Goals tab).
- **FR-006**: System MUST NOT count unspent monthly budget as savings.
- **FR-007**: System MUST floor the displayed savings total at €0 — never show a negative balance.

### Key Entities

- **Savings Contribution**: A spending entry with category "Savings". Represents money explicitly moved to a savings account.
- **Savings Withdrawal**: A spending entry with category "Savings Withdrawal". Represents money taken back from savings.
- **Starting Balance**: A numeric field on `budget_settings` (`savingsStartingBalance`). Represents savings accumulated before the app was used.

---

## Success Criteria

- **SC-001**: After logging a €500 Savings entry, the savings total increases by exactly €500.
- **SC-002**: A user with a €2,000 starting balance and a €5,000 goal sees 40% progress without any entries.
- **SC-003**: After logging a €300 Savings Withdrawal, the savings total decreases by exactly €300.
- **SC-004**: The savings goal card is visible on the Dashboard tab without navigating away.
- **SC-005**: The savings goal no longer changes based on unspent monthly budget — it only changes when Savings or Savings Withdrawal entries are added or deleted.
