# Tennis Training Schedule Refactoring

**Spec ID**: `tennis-schedule-refactoring`
**Created**: 2026-03-14
**Status**: Built (complete)
**Depends on**: `tennis-periodization-v1` (built)
**Source material**: E. Paul Roetert & Mark S. Kovacs (*Tennis Anatomy*), W. Timothy Gallwey (*The Inner Game of Tennis*), Brad Gilbert (*Winning Ugly*)

---

## The Problem

The current training plan tells you to stretch and do squats. It doesn't tell you how to become a better tennis player.

Specifically, the `PHASE_DESCRIPTIONS` in `tennis-periodization.ts` are pure gym/conditioning instructions. They list exercises (planks, calf raises, lateral lunges, wrist curls) but say nothing about:

1. **What to focus on during actual tennis practice** — stroke work, drills, patterns
2. **Mental game** — the Inner Game and Winning Ugly material was punted to "V2" and exists only as a single throwaway line in the Performance phase
3. **Tactical development** — playing style determines what you should drill, not just how many weeks you spend in each phase
4. **Progression** — phases don't tell you what "good enough to move on" looks like

A beginner on the 3-1 model gets: 3 weeks of "planks, dead bugs, calf raises" → 1 week of "foam rolling." That's a gym program with "Tennis" in the title. You could replace every mention of tennis with "badminton" and nothing would change.

### What Should Happen

Each phase description should answer three questions:
1. **What should I focus on during tennis practice?** (on-court)
2. **What supplemental training supports this phase?** (off-court)
3. **What mental/tactical skill am I developing?** (inner game)

These three layers should be differentiated by playing style where relevant.

---

## What Changes

### Phase descriptions become three-layered

The current `PHASE_DESCRIPTIONS` constant is a flat `Record<TennisPhaseType, string>` with one paragraph per phase. This changes to a structured object per phase containing:

| Layer | What it covers | Source |
|-------|---------------|--------|
| **On-Court Focus** | What to prioritize during tennis practice. Stroke focus, drills, rally patterns, serve targets. Differentiated by playing style. | Tennis Anatomy Parts 2-3 (stroke mechanics, playing styles), Winning Ugly Part 2 (shot selection, patterns) |
| **Supplemental Training** | The conditioning work. Exercises, sets, ratios. What's currently in the descriptions, refined. | Tennis Anatomy Parts 4-6 (exercises by body region) |
| **Mental Game** | Inner Game concentration technique for this phase. One concrete exercise, not a lecture. Plus relevant Winning Ugly tactical concept. | Inner Game Ch. 3-9 (Self 1/Self 2, seam-watching, nonjudgmental awareness), Winning Ugly Parts 1-2 (pre-match checklist, game plan, pressure) |

### Playing style changes content, not just duration

Currently, playing style only modifies phase *durations* (e.g., club baseliner gets `[3, 2, 3, 1]` instead of `[3, 3, 2, 1]`). The actual descriptions are identical regardless of style.

After this refactoring, the on-court focus layer varies by style:

| Phase | Baseliner | Serve & Volley | All-Court |
|-------|-----------|----------------|-----------|
| **Foundation & Prehab** | Groove groundstroke consistency. Cross-court rally targets (20-ball rallies). Serve placement over power. | Split step and volley footwork. Low volley depth. Serve-and-first-volley sequences. | Transition movement: baseline → net → recovery. Approach shot placement. |
| **Strength & Power** | Deep ball depth targets (behind service line). Aggressive return positioning. First-strike forehand patterns. | Explosive serve (leg drive, pronation). Poach movement. Overhead confidence. | Weight transfer drills. Inside-out forehand. Attack short balls with approach. |
| **Tennis-Specific Endurance** | Extended rally simulation (15+ ball rallies). Lateral endurance under fatigue. Recover-and-repeat patterns. | Quick-fire volleys under fatigue. Serve sets (10 serves, 30-second rest, repeat). Approach-volley-overhead sequences. | Full-point simulation: serve → rally → approach → volley. All-surface movement drills. |
| **Performance** | Match-intensity baseline rallies. Defensive-to-offensive transition. Change-of-direction under pressure. | Serve-and-volley under match pressure. Net coverage with passing shot simulation. | Mixing rally and net play. Reading opponent rhythm. Adapting mid-point. |
| **Recovery** | No structured drills. Light rallying for feel only. | No structured drills. Light volleying for touch. | No structured drills. Light mixed play for enjoyment. |

### Mental game appears in every phase, not just Performance

Currently, Inner Game content only shows up as one line in the Performance phase. After this refactoring, each phase has a phase-appropriate mental game focus:

| Phase | Inner Game Technique | Winning Ugly Tactical Concept |
|-------|---------------------|-------------------------------|
| **Foundation & Prehab** | **Nonjudgmental awareness** (Ch. 3-4). During practice, observe your strokes without labeling them good or bad. Notice where the ball goes without reacting. "See the ball as it is, not as you want it to be." This is the phase where you build the Self 1 / Self 2 relationship. | **Know Thyself** (Part 2). Honest self-assessment of your own strengths and weaknesses. What are your 3 best shots? What breaks down under pressure? Write it down. |
| **Strength & Power** | **Seam-watching** (Ch. 5). Focus on the seams of the ball from the moment it leaves your opponent's racket. Don't try to track spin analytically — just watch the pattern. This occupies Self 1 so Self 2 can swing freely. Practice this on every ball during warm-up. | **The Combination to the Lock** (Part 2). Start noticing patterns in your practice partners' games. Where do they go under pressure? What's their weakest shot? Build the habit of observation. |
| **Tennis-Specific Endurance** | **Bounce-hit** (Ch. 5). Say "bounce" when the ball bounces, "hit" when you make contact. This anchors attention to the present moment and prevents your mind from wandering to the score or the last error. Especially useful when fatigued. | **Who's Doing What to Whom?** (Part 2). During practice sets, ask yourself every 3 games: am I dictating play, or am I reacting? If you're reacting, what's one thing you can change? |
| **Performance** | **Breathing between points** (Ch. 7). After each point, focus on one full exhale before looking at your opponent. This resets attention, prevents the last point from contaminating the next one, and maintains the "quiet mind" state Gallwey describes. Use the walk back to the baseline as your reset ritual. | **The Pre-Match Mental Checklist** (Part 1). Before every practice set and match: (1) What do I want to make happen? (2) What do I want to prevent? (3) What is my opponent's weakest shot? Use the first changeover to reassess. |
| **Recovery** | **Effortless effort** (Ch. 2). During light rally play in recovery week, practice the feeling of letting the ball come to you. No targets, no intent to win the point. Just hit and notice what happens. This is where the Self 1 / Self 2 integration deepens. | **Tournament Tough All the Time** (Part 3). Treat every hitting session — even casual ones — as mental practice. Stay present, maintain routines between points, keep your feet moving. The habit of focus is built in low-stakes moments. |

### Description assembly becomes a function

Currently, phase descriptions are static strings looked up from a map. After this refactoring, the description for a phase is **assembled** from three layers, with the on-court layer selected based on playing style.

The signature of the internal builder:

```typescript
function buildPhaseDescription(
  phaseType: TennisPhaseType,
  playingStyle: TennisPlayingStyle,
  level: TennisPlayerLevel
): string;
```

The output is a single string (matching the existing `description` field on `GeneratedPhase` and the `training_phases` table), structured with section headers:

```
ON-COURT FOCUS
[Playing-style-specific practice guidance for this phase]

SUPPLEMENTAL TRAINING
[The conditioning work — exercises, ratios, references]

MENTAL GAME
[One Inner Game technique + one Winning Ugly concept for this phase]
```

This format means the user sees all three layers when they expand a phase in the UI. No UI changes needed — the existing `description` field in `TrainingPlanSection` already renders multi-line text.

### Beginner descriptions are gentler

The current beginner descriptions are identical to club — just shorter in duration. A beginner should get:
- Simpler on-court guidance (consistency over aggression, rally depth over placement)
- Clearer supplemental instructions (bodyweight only, lower volumes)
- Mental game framing that doesn't assume competitive match play

The `level` parameter in `buildPhaseDescription` handles this.

---

## What Does NOT Change

| Area | Why |
|------|-----|
| Schema | No new columns. The `description` field on `training_phases` already holds text of any length. |
| API routes | Descriptions are generated server-side during plan creation. The API shape is unchanged. |
| UI components | `TrainingPlanSection` already renders the `description` field. Multi-line text with section headers works as-is. |
| Phase types, durations, style modifiers | The periodization structure is correct. The problem is content, not architecture. |
| Limitation notes | `buildLimitationNotes()` is separate from phase descriptions and continues to work as-is. |
| Tests for level assessment, phase generation, style modifiers | These test structure, not content. They remain valid. |

**Total schema changes: 0. Total API changes: 0. Total UI changes: 0.**

---

## Detailed Phase Content

### Foundation & Prehab

**On-Court Focus (Baseliner)**
Groove your groundstrokes for consistency. Set a target: 20-ball cross-court forehand rallies, then 20-ball backhand rallies. Don't aim for winners — aim for depth (ball landing behind the service line). Practice serve placement, not speed: can you hit 6 out of 10 first serves to the deuce-side T? Focus on the contact point, not the result.

**On-Court Focus (Serve & Volley)**
Split step timing is everything. Have your practice partner feed balls to both sides while you practice: split step → volley → recover to center. Practice low volleys (below the net) separately — these require deep knee flexion. Serve-and-first-volley: serve to the T, take two steps in, hit the first volley deep down the line. Don't worry about the second volley yet.

**On-Court Focus (All-Court)**
Work on the transition game: approach shot placement followed by net coverage. Hit approach shots to the opponent's weaker side, then close to the net. Practice the footwork sequence: hit approach → split step at the service line → react to the passing shot. For baseline rallies, alternate between cross-court and down-the-line to build directional control.

**Supplemental Training (all styles)**
Core stability (planks, side planks, dead bugs, bird dogs), shoulder prehab (external rotation with band, scapular retraction, bent-over rear raises), lower body basics (eccentric calf raises, single-leg balance, bodyweight squats), mobility. Build the base. Fix imbalances. Prepare tendons and joints for higher loads. Back-to-chest exercise ratio: establish at least 1:1.

*Beginner modification*: Bodyweight only. Lower volumes (2 sets instead of 3). Focus on form over load. If you haven't done structured training before, this phase is about teaching your body the movement patterns — don't rush it.

**Mental Game**
*Inner Game — Nonjudgmental awareness*: During practice, notice where the ball goes without labeling shots as "good" or "bad." When you hit a ball into the net, observe it the way an umpire would — just a fact, not a verdict. "That ball went into the net" instead of "I suck." This is the foundation of the Self 1 / Self 2 relationship: you are building trust with your body by not berating it.

*Winning Ugly — Know Thyself*: Make an honest list of your 3 strongest and 3 weakest shots. What happens to your second serve under pressure? Where does your backhand go when you're tired? Write it down. This isn't about fixing everything — it's about knowing what you're working with.

**Reference**: Tennis Anatomy Parts 4 & 8, Inner Game Ch. 3-4, Winning Ugly Part 2.

---

### Strength & Power

**On-Court Focus (Baseliner)**
Work on depth and weight of shot. Every groundstroke should land behind the service line — put a rope or cones at the service line and aim deep. Practice the inside-out forehand: run around your backhand and hit forehands from the ad side. This is the single most important shot pattern for baseliners. Aggressive return practice: stand inside the baseline to receive second serves.

**On-Court Focus (Serve & Volley)**
Build explosive serve power. Focus on leg drive (knee bend → explosive push) and pronation (wrist snap at contact). Practice serve placement: wide, T, body — in sets of 10 to each spot. Practice poaching in doubles: read the return and move early. Work on the swinging volley (taking balls out of the air from mid-court as aggressive put-aways).

**On-Court Focus (All-Court)**
Weight transfer drills: hit an approach shot and move forward. Inside-out forehand from the ad side. Attack short balls — anything that lands inside the service line should be approached. Practice the "attack, don't push" principle: when you come to net, volley with intent, not just placement.

**Supplemental Training (all styles)**
Rotational power (medicine ball throws, cable wood chops, standing hip rotation), lateral leg strength (lateral lunges, lateral band walks, forward lunges, single-leg RDL), upper body (bent-over rows, push-ups, standing cable chest press), wrist/forearm work (wrist curls, reverse curls, pronation/supination). Maintain back-to-chest ratio of at least 1.5:1.

*Beginner modification*: This phase does not exist in the beginner model (3-1). Beginners move from Foundation directly to Recovery. The body needs more time at the foundation level before loading.

**Mental Game**
*Inner Game — Seam-watching*: During warm-up and rally practice, focus on the seams of the ball from the instant it leaves your opponent's racket. Don't try to read spin analytically — just watch the pattern. This occupies Self 1 (the conscious mind) so Self 2 (the body) can swing without interference. You'll notice you start tracking the ball better without trying to. Practice this on every ball, including serves you're receiving.

*Winning Ugly — The Combination to the Lock*: Start building your "little black book" habit. During practice sets, notice your opponent's patterns: where does their serve go under pressure? Do they go cross-court or down the line when they're stretched wide? What shot do they avoid? You don't need to write it down mid-match — just build the habit of observation.

**Reference**: Tennis Anatomy Parts 4 & 5, Inner Game Ch. 5, Winning Ugly Part 2.

---

### Tennis-Specific Endurance

**On-Court Focus (Baseliner)**
Extended rally simulation. Play practice points where you must hit at least 10 shots before going for a winner. The goal is to outlast, not to overpower. Cross-court rally consistency under fatigue: after 10 minutes of rallying, can you still keep 8 out of 10 shots deep? Practice the defensive-to-neutral-to-offensive transition: push deep, wait for the short ball, attack.

**On-Court Focus (Serve & Volley)**
Quick-fire volley drills: practice partner feeds rapid balls at the net, you volley back — 30-second bursts with equal rest. Serve sets: hit 10 serves, rest 30 seconds, repeat 5 times. Track first-serve percentage across the sets — it should stay above 50% even under fatigue. Approach-volley-overhead sequences: hit an approach, volley, then hit an overhead from the lob — 10 sequences without rest.

**On-Court Focus (All-Court)**
Full-point simulation from serve to finish. Serve, rally, approach on a short ball, volley or overhead. The goal is to play out complete point structures, not isolated strokes. Movement drills that combine baseline and net: rally from the baseline, close on a short ball, volley, recover to baseline. This is the most realistic match simulation you can do.

**Supplemental Training (all styles)**
Movement drills (spider drill, lateral shuffles, cross-step to recovery, split step drills), interval conditioning (5-15 second efforts with equal rest, mimicking point play), sport-specific circuits combining movement with stroke simulation under fatigue. 60-80% of movement work should be lateral.

*Beginner modification*: This phase does not exist in the beginner model (3-1).

**Mental Game**
*Inner Game — Bounce-hit*: Say "bounce" silently when the ball bounces, "hit" when you make contact. This simple rhythm anchors your attention to the present moment and prevents your mind from drifting to the score, the last error, or what you'll have for dinner. It's especially effective when you're fatigued and your mind wants to check out. If you notice you forgot to say "bounce" on a ball, don't judge yourself — just start again on the next one.

*Winning Ugly — Who's Doing What to Whom?*: During practice sets, stop every 3 games and ask: am I dictating play or reacting? Am I hitting to my opponent's weakness or their strength? If you're just hitting and hoping, choose one adjustment — hit more to the backhand, come to net on short balls, whatever — and commit to it for the next 3 games.

**Reference**: Tennis Anatomy Part 6, Inner Game Ch. 5, Winning Ugly Part 2.

---

### Performance

**On-Court Focus (Baseliner)**
Match-intensity baseline rallies. Play practice sets with tactical targets: "this set, I will come to net at least 3 times." Work on the defensive-to-offensive transition under real pressure. Practice change-of-direction when pushed wide — recovery footwork is what separates club players from advanced ones. Serve with a specific plan on every point: don't just toss and hit.

**On-Court Focus (Serve & Volley)**
Serve-and-volley under match pressure. Play practice sets where you must come to net on every first serve. Practice reading the return — which way is it going? — and reacting with a split step rather than guessing. Net coverage drills with passing shot simulation: partner hits from the baseline, you cover the net.

**On-Court Focus (All-Court)**
Full match simulation. Practice switching between rally mode and attack mode mid-point. The goal is pattern recognition: when is the right moment to approach? When should you stay back? Play practice sets where you consciously switch tactics every 2 games: 2 games baseline-only, 2 games attack-on-short-balls, 2 games serve-and-volley.

**Supplemental Training (all styles)**
Match-intensity training combining physical and tactical elements. High-speed movement patterns, explosive serves, pressure-point simulation. Reduce supplemental volume by ~30% compared to previous phases — the body is performing, not building.

*Beginner modification*: This phase does not exist in the beginner model (3-1).

**Mental Game**
*Inner Game — Breathing between points*: After each point, focus on one full exhale before looking at your opponent or the scoreboard. Use the walk back to the baseline as your reset ritual. This prevents the last point from contaminating the next one. The quiet mind doesn't carry baggage. If you lost a brutal rally, breathe. If you hit an ace, breathe. The process is the same.

*Winning Ugly — The Pre-Match Mental Checklist*: Before every practice set and match, answer three questions: (1) What do I want to make happen? (2) What do I want to prevent from happening? (3) What is my opponent's weakest shot? At the first changeover, reassess: is my plan working? If not, what's one thing I can change? "A player who has a plan is a thinking player. Even a bad plan is better than no plan at all."

**Reference**: Tennis Anatomy Part 6, Inner Game Ch. 7-9, Winning Ugly Parts 1-2.

---

### Recovery

**On-Court Focus (all styles)**
No structured drills. If you play during recovery week, play for enjoyment only. Light rallying for feel, not for targets. If you're doing match play (recurring activity), reduce intensity — play at 70%, experiment with shots you wouldn't normally try. This is not a lazy week; it's where your nervous system consolidates gains.

**Supplemental Training (all styles)**
No structured supplemental training. Light stretching, foam rolling, easy walking or swimming. Post-recovery self-assessment: Is your back-to-chest ratio still at least 1:1? Any shoulder, elbow, or Achilles discomfort? If yes, extend recovery or increase the relevant prevention exercise in the next cycle.

**Mental Game**
*Inner Game — Effortless effort*: During any light hitting this week, practice the feeling of letting the ball come to you. No targets, no intent to win the point. Just hit and notice. Watch the seams. Feel the racket. Hear the sound at contact. This is where the Self 1 / Self 2 integration deepens — you're practicing trust.

*Winning Ugly — Tournament Tough All the Time*: Even in a recovery week, maintain your between-point routines. Stay present. Keep your feet moving between shots. The habit of competitive focus is built in low-pressure moments, not high-pressure ones.

**Reference**: Tennis Anatomy Part 9, Inner Game Ch. 2, Winning Ugly Part 3.

---

## Implementation Details

### Data structure change

**Current** (`tennis-periodization.ts`):

```typescript
const PHASE_DESCRIPTIONS: Record<TennisPhaseType, string> = {
  "foundation-prehab": "Core stability (planks, side planks...)...",
  // ...one flat string per phase
};
```

**After**:

```typescript
interface PhaseContent {
  onCourt: Record<TennisPlayingStyle, string>;
  onCourtBeginner?: string;  // simpler guidance for beginners
  supplemental: string;
  supplementalBeginner?: string;  // lower-volume version
  mentalGame: string;
}

const PHASE_CONTENT: Record<TennisPhaseType, PhaseContent> = {
  "foundation-prehab": {
    onCourt: {
      baseliner: "Groove your groundstrokes for consistency...",
      "serve-volley": "Split step timing is everything...",
      "all-court": "Work on the transition game...",
    },
    onCourtBeginner: "Focus on consistency over power...",
    supplemental: "Core stability (planks, side planks...)...",
    supplementalBeginner: "Same exercises, bodyweight only, 2 sets...",
    mentalGame: "Inner Game — Nonjudgmental awareness: ...\n\nWinning Ugly — Know Thyself: ...",
  },
  // ...
};

function buildPhaseDescription(
  phaseType: TennisPhaseType,
  playingStyle: TennisPlayingStyle,
  level: TennisPlayerLevel
): string {
  const content = PHASE_CONTENT[phaseType];
  const isBeginner = level === "beginner";

  const onCourt = isBeginner && content.onCourtBeginner
    ? content.onCourtBeginner
    : content.onCourt[playingStyle];

  const supplemental = isBeginner && content.supplementalBeginner
    ? content.supplementalBeginner
    : content.supplemental;

  return [
    "ON-COURT FOCUS",
    onCourt,
    "",
    "SUPPLEMENTAL TRAINING",
    supplemental,
    "",
    "MENTAL GAME",
    content.mentalGame,
  ].join("\n");
}
```

### Changes to `generateTennisPhases`

The existing function signature:

```typescript
export function generateTennisPhases(
  level: TennisPlayerLevel,
  playingStyle: TennisPlayingStyle,
  physicalLimitations: PhysicalLimitation[],
  startDate: string
): GeneratedPhase[];
```

The only change: the `description` field on each `GeneratedPhase` is populated by `buildPhaseDescription(phaseType, playingStyle, level)` instead of the flat `PHASE_DESCRIPTIONS[phaseType]` lookup.

Everything else — date calculation, duration modifiers, limitation notes — stays the same.

### Existing plans

Plans already created will retain their old descriptions. This is fine — descriptions are stored as text in `training_phases.description` at creation time. New plans and restarted plans get the new content. No migration needed.

---

## Task Breakdown

| # | Task | Status | Description |
|---|------|--------|-------------|
| 1 | Replace phase description content structure | ✅ Done | Replaced `PHASE_DESCRIPTIONS` with `PHASE_CONTENT` + `PhaseContent` interface + `buildPhaseDescription()`. All 5 phases × 3 styles populated. |
| 2 | Wire new builder into phase generation | ✅ Done | `generateTennisPhases()` calls `buildPhaseDescription()`. Exported for testing. |
| 3 | Update tests | ✅ Done | 37 tests passing (6 new for `buildPhaseDescription` covering section headers, style differentiation, beginner overrides, mental game content). |
| 4 | Verify limitation notes still work correctly | ✅ Done | Existing limitation tests pass. Limitations are appended independently of descriptions. |

**Total: 4 tasks completed. No schema, API, or UI changes.**

---

## Scope Boundaries

### In Scope
- Three-layered phase descriptions (on-court, supplemental, mental game)
- Playing-style-specific on-court focus
- Beginner-specific simplified descriptions
- Inner Game techniques in every phase (not just Performance)
- Winning Ugly tactical concepts in every phase
- Updated tests

### Out of Scope

| Feature | Why |
|---------|-----|
| UI formatting of sections | The existing `description` field renders text. Section headers in plain text are readable. Rich formatting (collapsible sections, tabs) is a separate UI enhancement. |
| Exercise library or drill database | The descriptions reference drills and exercises by name. The user applies them. The app is not an exercise database. |
| Video or image references | Text descriptions are sufficient. Multimedia content is a different product. |
| Automated progression criteria | "Good enough to move on" guidance is in the descriptions as qualitative targets. Quantitative tracking (e.g., "hit 8/10 deep groundstrokes") is a separate feature. |
| Match-specific mental checklists | The pre-match checklist concept appears in the Performance phase description. A standalone pre-match checklist feature is V2. |

---

*Specification complete. Implementation complete. Deployed 2026-03-14.*
