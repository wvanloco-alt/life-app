import type {
  TennisPlayerLevel,
  TennisPlayingStyle,
  TennisPeriodizationModel,
  TennisPhaseType,
  PhysicalLimitation,
  LevelAssessment,
} from "@/types";
import type { GeneratedPhase } from "./periodization";
import { addWeeks, format } from "date-fns";

interface TennisPhaseTemplate {
  type: TennisPhaseType;
  weeks: number;
}

interface PhaseContent {
  onCourt: Record<TennisPlayingStyle, string>;
  onCourtBeginner?: string;
  supplemental: string;
  supplementalBeginner?: string;
  mentalGame: string;
}

const PHASE_CONTENT: Record<TennisPhaseType, PhaseContent> = {
  "foundation-prehab": {
    onCourt: {
      baseliner:
        "Groove your groundstrokes for consistency. Set a target: 20-ball cross-court forehand rallies, then 20-ball backhand rallies. Don't aim for winners — aim for depth (ball landing behind the service line). Practice serve placement, not speed: can you hit 6 out of 10 first serves to the deuce-side T? Focus on the contact point, not the result.",
      "serve-volley":
        "Split step timing is everything. Have your practice partner feed balls to both sides while you practice: split step → volley → recover to center. Practice low volleys (below the net) separately — these require deep knee flexion. Serve-and-first-volley: serve to the T, take two steps in, hit the first volley deep down the line. Don't worry about the second volley yet.",
      "all-court":
        "Work on the transition game: approach shot placement followed by net coverage. Hit approach shots to the opponent's weaker side, then close to the net. Practice the footwork sequence: hit approach → split step at the service line → react to the passing shot. For baseline rallies, alternate between cross-court and down-the-line to build directional control.",
    },
    onCourtBeginner:
      "Focus on consistency over power. Rally cross-court and count how many balls you can keep in play — aim for 10, then 15, then 20. Serve placement: just get the ball in the service box reliably before worrying about targets. Keep the rally going; let your body learn the rhythm of hitting.",
    supplemental:
      "Core stability (planks, side planks, dead bugs, bird dogs), shoulder prehab (external rotation with band, scapular retraction, bent-over rear raises), lower body basics (eccentric calf raises, single-leg balance, bodyweight squats), mobility. Build the base. Fix imbalances. Prepare tendons and joints for higher loads. Back-to-chest exercise ratio: establish at least 1:1.",
    supplementalBeginner:
      "Same exercises, bodyweight only, 2 sets instead of 3. Focus on form over load. If you haven't done structured training before, this phase is about teaching your body the movement patterns — don't rush it.",
    mentalGame:
      "Inner Game — Nonjudgmental awareness: During practice, notice where the ball goes without labeling shots as \"good\" or \"bad.\" When you hit a ball into the net, observe it the way an umpire would — just a fact, not a verdict. \"That ball went into the net\" instead of \"I suck.\" This is the foundation of the Self 1 / Self 2 relationship: you are building trust with your body by not berating it.\n\nWinning Ugly — Know Thyself: Make an honest list of your 3 strongest and 3 weakest shots. What happens to your second serve under pressure? Where does your backhand go when you're tired? Write it down. This isn't about fixing everything — it's about knowing what you're working with.",
  },
  "strength-power": {
    onCourt: {
      baseliner:
        "Work on depth and weight of shot. Every groundstroke should land behind the service line — put a rope or cones at the service line and aim deep. Practice the inside-out forehand: run around your backhand and hit forehands from the ad side. This is the single most important shot pattern for baseliners. Aggressive return practice: stand inside the baseline to receive second serves.",
      "serve-volley":
        "Build explosive serve power. Focus on leg drive (knee bend → explosive push) and pronation (wrist snap at contact). Practice serve placement: wide, T, body — in sets of 10 to each spot. Practice poaching in doubles: read the return and move early. Work on the swinging volley (taking balls out of the air from mid-court as aggressive put-aways).",
      "all-court":
        "Weight transfer drills: hit an approach shot and move forward. Inside-out forehand from the ad side. Attack short balls — anything that lands inside the service line should be approached. Practice the \"attack, don't push\" principle: when you come to net, volley with intent, not just placement.",
    },
    supplemental:
      "Rotational power (medicine ball throws, cable wood chops, standing hip rotation), lateral leg strength (lateral lunges, lateral band walks, forward lunges, single-leg RDL), upper body (bent-over rows, push-ups, standing cable chest press), wrist/forearm work (wrist curls, reverse curls, pronation/supination). Maintain back-to-chest ratio of at least 1.5:1.",
    mentalGame:
      "Inner Game — Seam-watching: During warm-up and rally practice, focus on the seams of the ball from the instant it leaves your opponent's racket. Don't try to read spin analytically — just watch the pattern. This occupies Self 1 (the conscious mind) so Self 2 (the body) can swing without interference. You'll notice you start tracking the ball better without trying to. Practice this on every ball, including serves you're receiving.\n\nWinning Ugly — The Combination to the Lock: Start building your \"little black book\" habit. During practice sets, notice your opponent's patterns: where does their serve go under pressure? Do they go cross-court or down the line when they're stretched wide? What shot do they avoid? You don't need to write it down mid-match — just build the habit of observation.",
  },
  "tennis-endurance": {
    onCourt: {
      baseliner:
        "Extended rally simulation. Play practice points where you must hit at least 10 shots before going for a winner. The goal is to outlast, not to overpower. Cross-court rally consistency under fatigue: after 10 minutes of rallying, can you still keep 8 out of 10 shots deep? Practice the defensive-to-neutral-to-offensive transition: push deep, wait for the short ball, attack.",
      "serve-volley":
        "Quick-fire volley drills: practice partner feeds rapid balls at the net, you volley back — 30-second bursts with equal rest. Serve sets: hit 10 serves, rest 30 seconds, repeat 5 times. Track first-serve percentage across the sets — it should stay above 50% even under fatigue. Approach-volley-overhead sequences: hit an approach, volley, then hit an overhead from the lob — 10 sequences without rest.",
      "all-court":
        "Full-point simulation from serve to finish. Serve, rally, approach on a short ball, volley or overhead. The goal is to play out complete point structures, not isolated strokes. Movement drills that combine baseline and net: rally from the baseline, close on a short ball, volley, recover to baseline. This is the most realistic match simulation you can do.",
    },
    supplemental:
      "Movement drills (spider drill, lateral shuffles, cross-step to recovery, split step drills), interval conditioning (5-15 second efforts with equal rest, mimicking point play), sport-specific circuits combining movement with stroke simulation under fatigue. 60-80% of movement work should be lateral.",
    mentalGame:
      "Inner Game — Bounce-hit: Say \"bounce\" silently when the ball bounces, \"hit\" when you make contact. This simple rhythm anchors your attention to the present moment and prevents your mind from drifting to the score, the last error, or what you'll have for dinner. It's especially effective when you're fatigued and your mind wants to check out. If you notice you forgot to say \"bounce\" on a ball, don't judge yourself — just start again on the next one.\n\nWinning Ugly — Who's Doing What to Whom?: During practice sets, stop every 3 games and ask: am I dictating play or reacting? Am I hitting to my opponent's weakness or their strength? If you're just hitting and hoping, choose one adjustment — hit more to the backhand, come to net on short balls, whatever — and commit to it for the next 3 games.",
  },
  performance: {
    onCourt: {
      baseliner:
        "Match-intensity baseline rallies. Play practice sets with tactical targets: \"this set, I will come to net at least 3 times.\" Work on the defensive-to-offensive transition under real pressure. Practice change-of-direction when pushed wide — recovery footwork is what separates club players from advanced ones. Serve with a specific plan on every point: don't just toss and hit.",
      "serve-volley":
        "Serve-and-volley under match pressure. Play practice sets where you must come to net on every first serve. Practice reading the return — which way is it going? — and reacting with a split step rather than guessing. Net coverage drills with passing shot simulation: partner hits from the baseline, you cover the net.",
      "all-court":
        "Full match simulation. Practice switching between rally mode and attack mode mid-point. The goal is pattern recognition: when is the right moment to approach? When should you stay back? Play practice sets where you consciously switch tactics every 2 games: 2 games baseline-only, 2 games attack-on-short-balls, 2 games serve-and-volley.",
    },
    supplemental:
      "Match-intensity training combining physical and tactical elements. High-speed movement patterns, explosive serves, pressure-point simulation. Reduce supplemental volume by ~30% compared to previous phases — the body is performing, not building.",
    mentalGame:
      "Inner Game — Breathing between points: After each point, focus on one full exhale before looking at your opponent or the scoreboard. Use the walk back to the baseline as your reset ritual. This prevents the last point from contaminating the next one. The quiet mind doesn't carry baggage. If you lost a brutal rally, breathe. If you hit an ace, breathe. The process is the same.\n\nWinning Ugly — The Pre-Match Mental Checklist: Before every practice set and match, answer three questions: (1) What do I want to make happen? (2) What do I want to prevent from happening? (3) What is my opponent's weakest shot? At the first changeover, reassess: is my plan working? If not, what's one thing I can change? \"A player who has a plan is a thinking player. Even a bad plan is better than no plan at all.\"",
  },
  recovery: {
    onCourt: {
      baseliner:
        "No structured drills. If you play during recovery week, play for enjoyment only. Light rallying for feel, not for targets. Reduce intensity — play at 70%, experiment with shots you wouldn't normally try.",
      "serve-volley":
        "No structured drills. If you play during recovery week, play for enjoyment only. Light volleying for touch. Reduce intensity — play at 70%, experiment with shots you wouldn't normally try.",
      "all-court":
        "No structured drills. If you play during recovery week, play for enjoyment only. Light mixed play for enjoyment. Reduce intensity — play at 70%, experiment with shots you wouldn't normally try.",
    },
    supplemental:
      "No structured supplemental training. Light stretching, foam rolling, easy walking or swimming. Post-recovery self-assessment: Is your back-to-chest ratio still at least 1:1? Any shoulder, elbow, or Achilles discomfort? If yes, extend recovery or increase the relevant prevention exercise in the next cycle.",
    mentalGame:
      "Inner Game — Effortless effort: During any light hitting this week, practice the feeling of letting the ball come to you. No targets, no intent to win the point. Just hit and notice. Watch the seams. Feel the racket. Hear the sound at contact. This is where the Self 1 / Self 2 integration deepens — you're practicing trust.\n\nWinning Ugly — Tournament Tough All the Time: Even in a recovery week, maintain your between-point routines. Stay present. Keep your feet moving between shots. The habit of competitive focus is built in low-pressure moments, not high-pressure ones.",
  },
};

export function buildPhaseDescription(
  phaseType: TennisPhaseType,
  playingStyle: TennisPlayingStyle,
  level: TennisPlayerLevel
): string {
  const content = PHASE_CONTENT[phaseType];
  const isBeginner = level === "beginner";

  const onCourt =
    isBeginner && content.onCourtBeginner
      ? content.onCourtBeginner
      : content.onCourt[playingStyle];

  const supplemental =
    isBeginner && content.supplementalBeginner
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

const BASE_TEMPLATES: Record<
  TennisPeriodizationModel,
  TennisPhaseTemplate[]
> = {
  "3-1": [
    { type: "foundation-prehab", weeks: 3 },
    { type: "recovery", weeks: 1 },
  ],
  "3-3-2-1": [
    { type: "foundation-prehab", weeks: 3 },
    { type: "strength-power", weeks: 3 },
    { type: "tennis-endurance", weeks: 2 },
    { type: "recovery", weeks: 1 },
  ],
  "3-2-1": [
    { type: "strength-power", weeks: 3 },
    { type: "performance", weeks: 2 },
    { type: "recovery", weeks: 1 },
  ],
};

type StyleModifiers = Record<TennisPlayingStyle, number[]>;

const CLUB_STYLE_MODIFIERS: StyleModifiers = {
  "all-court": [3, 3, 2, 1],
  baseliner: [3, 2, 3, 1],
  "serve-volley": [3, 3, 1, 1],
};

const ADVANCED_STYLE_MODIFIERS: StyleModifiers = {
  "all-court": [3, 2, 1],
  baseliner: [2, 3, 1],
  "serve-volley": [3, 1, 1],
};

const LIMITATION_NOTES: Record<PhysicalLimitation, Record<string, string>> = {
  shoulder: {
    "foundation-prehab":
      "Extra emphasis on external rotation and posterior deltoid work. " +
      "Monitor deceleration fatigue after serves/overheads.",
    "strength-power":
      "Limit overhead pressing volume. Focus on rows and rear delt work. " +
      "Maintain back-to-chest ratio well above 1.5:1.",
    default: "Monitor shoulder comfort. Stop if sharp or radiating pain occurs.",
  },
  back: {
    "foundation-prehab":
      "Anti-extension core work (planks, dead bugs). Bird dogs for thoracic extension. " +
      "Avoid heavy spinal loading. Scapular retraction is mandatory.",
    "strength-power":
      "No heavy spinal loading (avoid barbell squats, deadlifts). " +
      "Use single-leg and anti-rotation exercises instead.",
    default: "Prioritize neutral spine positioning in all exercises.",
  },
  knee: {
    "foundation-prehab":
      "Gluteus medius activation priority (lateral band walks). " +
      "Single-leg balance progressions. Monitor knee valgus during lunges.",
    "strength-power":
      "Focus on hip-dominant movements. Monitor knee tracking during lateral lunges. " +
      "Reduce plyometric volume if knee discomfort occurs.",
    default: "Watch for swelling after lateral movement drills.",
  },
  elbow: {
    "foundation-prehab":
      "Reverse wrist curls every session. Eccentric wrist extension. Check grip size.",
    "strength-power":
      "Continue reverse wrist curls. Avoid heavy gripping exercises. " +
      "Use fat-grip adaptors if available.",
    default: "Monitor elbow discomfort during forehand and backhand drills.",
  },
  ankle: {
    "foundation-prehab":
      "Slow eccentric calf raises (3-4 second lowering phase). " +
      "Proprioception drills (single-leg balance, eyes closed progression). " +
      "Gradual volume increase.",
    "tennis-endurance":
      "Progressive lateral movement volume. Start with controlled shuffles, " +
      "build to match-speed changes of direction over weeks.",
    default: "Monitor Achilles stiffness, especially morning after training.",
  },
  adductor: {
    "foundation-prehab":
      "Progressive lateral lunge depth (start bodyweight, build range gradually). " +
      "Copenhagen plank if tolerated. Stop at any groin discomfort.",
    "tennis-endurance":
      "Gradual progression of wide-stance lateral movements. " +
      "Warm up with light lateral shuffles before drills.",
    default: "Stop immediately if groin pain occurs during lateral movements.",
  },
};

function selfRatingToLevel(rating: string): TennisPlayerLevel {
  if (rating === "advanced") return "advanced";
  if (rating === "club") return "club";
  return "beginner";
}

function experienceToLevel(years: number): TennisPlayerLevel {
  if (years < 2) return "beginner";
  if (years <= 5) return "club";
  return "advanced";
}

const LEVEL_RANK: Record<TennisPlayerLevel, number> = {
  beginner: 0,
  club: 1,
  advanced: 2,
};

const MODEL_FOR_LEVEL: Record<TennisPlayerLevel, TennisPeriodizationModel> = {
  beginner: "3-1",
  club: "3-3-2-1",
  advanced: "3-2-1",
};

const LEVEL_EXPLANATIONS: Record<TennisPlayerLevel, string> = {
  beginner:
    "Beginners need to build a conditioning base before adding intensity. " +
    "Tendons and stabilizers (especially rotator cuff and Achilles) need time to adapt.",
  club:
    "Club-level players benefit from structured periodization that separates " +
    "foundation work, strength, and sport-specific endurance to prevent overtraining.",
  advanced:
    "Advanced players have a strong base and benefit from focused strength/power " +
    "and performance phases with shorter cycles.",
};

export function assessTennisLevel(
  selfRating: string,
  yearsPlaying: number
): LevelAssessment {
  const ratingLevel = selfRatingToLevel(selfRating);
  const expLevel = experienceToLevel(yearsPlaying);

  const derivedLevel =
    LEVEL_RANK[ratingLevel] <= LEVEL_RANK[expLevel] ? ratingLevel : expLevel;

  const recommendedModel = MODEL_FOR_LEVEL[derivedLevel];

  const totalWeeks = BASE_TEMPLATES[recommendedModel].reduce(
    (sum, t) => sum + t.weeks,
    0
  );

  const explanation =
    `Self-rated ${selfRating} with ${yearsPlaying} year(s) of regular play ` +
    `places you at the ${derivedLevel} level. ${LEVEL_EXPLANATIONS[derivedLevel]}`;

  return {
    derivedLevel,
    recommendedModel,
    cycleLengthWeeks: totalWeeks,
    explanation,
  };
}

export function buildLimitationNotes(
  phaseType: TennisPhaseType,
  limitations: PhysicalLimitation[]
): string | null {
  if (limitations.length === 0) return null;

  const notes: string[] = [];
  for (const lim of limitations) {
    const limNotes = LIMITATION_NOTES[lim];
    const note = limNotes[phaseType] ?? limNotes.default;
    if (note) {
      notes.push(`${lim.charAt(0).toUpperCase() + lim.slice(1)}: ${note}`);
    }
  }

  return notes.length > 0 ? notes.join(" | ") : null;
}

export function generateTennisPhases(
  level: TennisPlayerLevel,
  playingStyle: TennisPlayingStyle,
  physicalLimitations: PhysicalLimitation[],
  startDate: string
): GeneratedPhase[] {
  const model = MODEL_FOR_LEVEL[level];
  const baseTemplates = BASE_TEMPLATES[model];

  let weekDurations: number[];
  if (model === "3-3-2-1") {
    weekDurations = CLUB_STYLE_MODIFIERS[playingStyle];
  } else if (model === "3-2-1") {
    weekDurations = ADVANCED_STYLE_MODIFIERS[playingStyle];
  } else {
    weekDurations = baseTemplates.map((t) => t.weeks);
  }

  const phases: GeneratedPhase[] = [];
  let currentDate = new Date(startDate + "T00:00:00");

  for (let i = 0; i < baseTemplates.length; i++) {
    const t = baseTemplates[i];
    const weeks = weekDurations[i];
    const phaseStart = format(currentDate, "yyyy-MM-dd");
    const phaseEnd = format(addWeeks(currentDate, weeks), "yyyy-MM-dd");

    phases.push({
      phaseType: t.type,
      orderIndex: i,
      durationWeeks: weeks,
      startDate: phaseStart,
      endDate: phaseEnd,
      description: buildPhaseDescription(t.type, playingStyle, level),
      limitationNotes: buildLimitationNotes(t.type, physicalLimitations),
    });

    currentDate = addWeeks(currentDate, weeks);
  }

  return phases;
}

export function getTennisPhaseDisplayName(phaseType: TennisPhaseType): string {
  const names: Record<TennisPhaseType, string> = {
    "foundation-prehab": "Foundation & Prehab",
    "strength-power": "Strength & Power",
    "tennis-endurance": "Tennis-Specific Endurance",
    performance: "Performance",
    recovery: "Recovery",
  };
  return names[phaseType];
}

export function getTennisCycleTotalWeeks(
  level: TennisPlayerLevel,
  playingStyle: TennisPlayingStyle
): number {
  const model = MODEL_FOR_LEVEL[level];
  if (model === "3-3-2-1") {
    return CLUB_STYLE_MODIFIERS[playingStyle].reduce((a, b) => a + b, 0);
  }
  if (model === "3-2-1") {
    return ADVANCED_STYLE_MODIFIERS[playingStyle].reduce((a, b) => a + b, 0);
  }
  return BASE_TEMPLATES[model].reduce((sum, t) => sum + t.weeks, 0);
}
