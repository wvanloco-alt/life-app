import type {
  ClimberLevel,
  ClimbingLimitation,
  Discipline,
  ClimbingPeriodizationModel,
  ClimbingPhaseType,
  LevelAssessment,
} from "@/types";
import { addWeeks, format } from "date-fns";

export interface GeneratedPhase {
  phaseType: string;
  orderIndex: number;
  durationWeeks: number;
  startDate: string;
  endDate: string;
  description: string;
  sportFocusContent?: string | null;
  supplementalContent?: string | null;
  mentalGameContent?: string | null;
  limitationNotes?: string | null;
}

interface PhaseTemplate {
  type: ClimbingPhaseType;
  weeks: number;
}

interface ClimbingPhaseContent {
  climbing: Record<Discipline, string>;
  climbingBeginner?: string;
  supplemental: string;
  supplementalBeginner?: string;
  mentalGame: string;
}

const PHASE_CONTENT: Record<ClimbingPhaseType, ClimbingPhaseContent> = {
  "skill-stamina": {
    climbing: {
      bouldering:
        "Climb at your max grade minus 2 for volume. Target 20-30 problems per session, all clean. Focus on three technique pillars: (1) silent feet -- place each foot deliberately with zero noise on the hold, (2) hip positioning -- keep your hips close to the wall and rotate into each reach, (3) reading -- study every problem for 30 seconds before touching the wall. No projecting: if a problem takes more than 3 attempts, move on. Practice slow-motion climbing at half speed for at least 15 minutes per session -- exaggerate every body position and notice where your weight is.",
      sport:
        "Route volume is king. Climb 6-10 routes per session at 1-2 grades below your redpoint max. Every route should be an onsight or flash attempt -- read the route from the ground, plan rest positions, and commit to your sequence. Practice clipping efficiency: clip at chest height, not above your head (wastes energy and puts you in a weak position). On rest holds, practice the shake-out technique: drop one arm, shake it below your hip, breathe out fully, and count to 10 before switching arms. Include at least one sustained route per session that keeps you on the wall for 5+ minutes without rest.",
    },
    climbingBeginner:
      "Climb everything. Do not limit yourself to one style. Climb 15-20 easy routes or problems per session at a grade where you can complete them all without falling. Focus entirely on footwork: look at your feet, place them precisely, and trust them. No campus-style pulling -- if your feet cut, you're using too much upper body. Practice traversing at the end of each session: 5-10 minutes of continuous lateral movement without stepping off the wall. This builds stamina and footwork simultaneously.",
    supplemental:
      "Core stability (hollow body holds 3x30sec, plank variations 3x45sec, hanging leg raises 3x10), antagonist work (push-ups 3x15, wrist extensions 3x20, reverse flys 3x12, external shoulder rotations 3x15/arm). Antagonist work is not optional -- it prevents the muscle imbalances that cause shoulder impingement and golfer's elbow. The pulling-to-pushing ratio in climbing is heavily skewed; if you do not actively counterbalance it, injury is a matter of when, not if (Hörst, Ch. 6). Minimum 2x/week, ideally at the end of each climbing session.",
    supplementalBeginner:
      "Core stability (hollow body holds 2x30sec, plank variations 2x45sec, hanging leg raises 2x10), antagonist work (push-ups 2x15, wrist extensions 2x20, reverse flys 2x12, external shoulder rotations 2x15/arm). This is the same movement “family” as standard supplemental for this phase—just at a beginner volume: 2 sets instead of 3, bodyweight only. Minimum 2x/week, ideally at the end of each climbing session. Add basic pull-ups if you can do fewer than 5: hang from a bar and do slow negatives (3-second lowering) for 3x3. Do not use a fingerboard—your tendons need 1-2 years of climbing-specific loading before they can handle isolated finger training safely.",
    mentalGame:
      "Separate your self-image from your climbing performance (Hörst, Mental Wings #1). When you fall off a problem, observe it without judgment: \"I fell on move 7 because my foot slipped\" not \"I'm weak\" or \"I suck.\" This is the foundation of the performance mindset -- you are gathering data, not passing verdicts. Practice the 60-second visualization exercise before your hardest attempt: close your eyes, replay your best send in vivid detail -- the holds, the sequence, the feeling of sticking the crux. Then open your eyes and climb.\n\nTrack your Energy-Emotion state at the start of each session: Energy 0-10, Emotion -5 to +5. Over weeks, you'll notice patterns: what conditions produce your best sessions? What kills your motivation? Write it down. This is Hörst's ANSWER sequence -- Awareness, Notice, Study, Willing adjustment, Evaluation, Repeat.",
  },
  "max-strength-power": {
    climbing: {
      bouldering:
        "This is your hardest training phase. Climb at V-max: 2-3 problems at your absolute limit per 30-minute block, with 3-5 minutes of complete rest between attempts. Quality over quantity -- if you're not resting long enough, you're training endurance, not strength. Work one signature weakness: if crimps are your limiter, project crimp-intensive problems. If slopers kill you, find sloper problems. After bouldering, do fingerboard work: repeaters for intermediate (5 grips x 5 hangs x 5 sec, 3 min rest between grips) or max hangs for advanced (3 grips x 3 sets x 5 sec, 5 min rest, add weight when you can hang 8+ seconds).",
      sport:
        "Hard bouldering for the first half of the session (same protocol as bouldering discipline). Then practice power moves on routes: find sport routes with distinct crux sequences and rehearse the crux in isolation. Clip-to-clip sections at your limit. The goal is to develop the ability to produce maximal force for 3-5 moves in a row -- the kind of effort that gets you through a route crux. Fingerboard work as above: repeaters (intermediate) or max hangs (advanced).",
    },
    climbingBeginner:
      "No fingerboard. No campus board. Hard bouldering only -- pick problems at your limit and try them 3-5 times each with 2-3 minutes rest between attempts. Focus on learning to try hard: pull with full commitment, generate momentum, and be comfortable with falling. This phase teaches effort application, not raw strength.",
    supplemental:
      "Weighted pull-ups (3x5-8, add weight when you hit 8 reps cleanly, 3 min rest), lock-offs or Frenchies (3 sets: pull to top, hold 5 sec, lower to 90 degrees, hold 5 sec, lower to 120 degrees, hold 5 sec, 5 min rest), core power (front lever progressions 3x5-10sec, ab wheel rollouts 3x8-12). Antagonist work continues at 2x/week minimum -- do NOT skip it during the strength phase. Add dips 3x10 to counterbalance the increased pulling volume.\n\nFor advanced climbers only: campus board laddering (5 sets of 6-12 hand moves, 5 min rest) or one-arm lock-offs (3 sets of 5-15 sec/arm, 5 min rest). Campus board requires 3+ years of climbing and leading at least 6c -- this is non-negotiable for tendon safety (Hörst, Ch. 5). Cycle campus work 2 weeks on, 2 weeks off.",
    supplementalBeginner:
      "Pull-ups to failure (3 sets, 3 min rest). If you cannot do 5 pull-ups, do slow negatives (3 sec lowering, 3x5). Bodyweight core work only. No weighted exercises, no fingerboard, no campus board.",
    mentalGame:
      "Develop a pre-climb ritual (Hörst, Mental Wings #7). Before every serious attempt: (1) chalk up, (2) visualize the sequence move by move, (3) take one deep breath and exhale fully, (4) climb. The same ritual every time, no exceptions. This creates a mental trigger that shifts your brain from thinking mode to execution mode. When the ritual becomes automatic, you'll notice you climb better on hard attempts because your conscious mind (Self 1) is occupied with the ritual instead of interfering with your body (Self 2).\n\nTension control (Hörst, Mental Wings #8): At the rest position before a crux, do a rapid body scan. Jaw clenched? Relax it. Shoulders by your ears? Drop them. Overgripping? Loosen by one notch. Breathing held? Exhale. You are looking for the minimum grip force that keeps you on the wall -- any extra tension is wasted energy. Practice the ANSWER check: \"Am I unnecessarily tight? Where?\"",
  },
  "anaerobic-endurance": {
    climbing: {
      bouldering:
        "4x4s: pick 4 boulder problems at 2-3 grades below your max. Climb all 4 back-to-back without rest (down-climb or jump off and immediately start the next one). Rest 4 minutes. Repeat 4 times. If you can complete all 4 sets cleanly, the problems are too easy -- move up a grade. This trains your body's lactate clearance system: you're deliberately climbing while pumped and teaching your forearms to recover under load. Also practice boulder link-ups: connect 3-4 problems into one long sequence by down-climbing between them.",
      sport:
        "Route intervals are your bread and butter. Climb a route at your limit for 3-5 minutes, rest 3-5 minutes (1:1 work-to-rest ratio), repeat 3-5 times. The goal is to sustain hard climbing while pumped. If you're indoors, do laps: climb up, down-climb, climb up again without stepping off the wall. Include traverse training: 2-4 minutes of continuous traversing at moderate difficulty, 2 minutes rest, 4-5 sets. This builds the base-level forearm endurance that allows you to recover on rest holds during a redpoint attempt.",
    },
    climbingBeginner:
      "Sustained volume climbing: climb for 45-60 minutes continuously at 2 grades below your max, with minimal rest (only when pumped, shake out for 30 seconds, continue). Traverse at the end of each session for 10-15 minutes without stopping. No 4x4s -- your movement efficiency is not yet good enough to benefit from interval training. You'll waste energy on bad technique rather than training your pump tolerance.",
    supplemental:
      "This phase reduces supplemental volume. Cut isolation work by ~30% compared to the strength phase -- the climbing volume is higher and recovery demands increase. Maintain antagonist work at 2x/week (non-negotiable). Core work shifts to endurance: plank holds for time (3x60sec), hanging knee raises 3x15. No heavy pulling exercises -- your fingers and forearms need recovery for the next climbing session. Light shoulder prehab continues.",
    mentalGame:
      "Positive self-talk under pump (Hörst, Mental Wings #9): When your forearms are burning and your brain says \"I'm going to fall,\" replace it with a directive: \"Breathe. Move your feet. Next hold.\" Practice this in training so it becomes automatic in performance. The pump is a sensation, not a verdict -- it means your body is working, not that you're about to fail.\n\nConfidence building (Hörst, Mental Wings #5): This phase produces visible endurance gains. Track your 4x4 performance: how many sets could you complete in week 1 vs week 2? Your traverse duration? Log this. Evidence of progress builds legitimate confidence, which is the single most important mental skill for hard sends. When you step onto your project, you need to believe -- based on evidence, not hope -- that you can do it.",
  },
  rest: {
    climbing: {
      bouldering:
        "No structured climbing. If you go to the gym, climb easy problems for fun -- half your max grade, no effort, no goals. Play on the wall. Try moves you'd never do in training: dynos to jugs, heel hooks on slabs, weird body positions. Or don't climb at all. Walk, hike, swim, stretch, do yoga. This is where supercompensation happens: your body is rebuilding stronger than before. Connective tissue (tendons, pulleys) recovers 2-3x slower than muscle -- if you cut rest short, the muscles feel ready but the tendons are not, and that's when A2 pulley injuries happen (Hörst, Ch. 9).",
      sport:
        "No structured climbing. If you go to the gym, climb easy routes for fun -- half your max grade, no effort, no goals. Play on the wall. Try moves you'd never do in training: dynos to jugs, heel hooks on slabs, weird body positions. Or don't climb at all. Walk, hike, swim, stretch, do yoga. This is where supercompensation happens: your body is rebuilding stronger than before. Connective tissue (tendons, pulleys) recovers 2-3x slower than muscle -- if you cut rest short, the muscles feel ready but the tendons are not, and that's when A2 pulley injuries happen (Hörst, Ch. 9).",
    },
    supplemental:
      "No structured supplemental training. Light stretching and foam rolling only. If you've been doing antagonist work consistently, you can take a full week off from it. Post-rest self-assessment: any finger soreness? Shoulder discomfort? Elbow ache? If yes, extend rest by 3-4 days before starting the next cycle. \"The most common training mistake is not resting enough\" (Hörst, Ch. 8).",
    mentalGame:
      "Process review (Hörst, Mental Wings #10): At the end of the rest phase, review your training log from the past cycle. What went well? Where did you skip sessions? What triggered the skips (evening alone, long work day, social event)? This is not self-criticism -- it's data collection. Adjust the next cycle based on what you learned. Write down 3 things you'll do differently in the next cycle and 3 things you'll keep doing.\n\nPractice the love of climbing (Hörst, Mental Wings #10): Remember why you started. Watch climbing videos. Read training books (you have three). Go to the gym with a friend and just play. If climbing feels like a chore, something is wrong with your approach. The rest phase is also a motivation reset.",
  },
};

export interface ClimbingPhaseContentLayers {
  sportFocusContent: string;
  supplementalContent: string;
  mentalGameContent: string;
}

/**
 * Returns the three content layers for a climbing phase as separate strings.
 * Used by Phase 2 of the training-supplemental-split feature to write each
 * layer to its own column on `training_phases`.
 *
 * The session-type-aware scheduler picks the relevant layer at notes-attachment
 * time: training sessions get sportFocus + mentalGame; supplemental sessions
 * get supplementalContent only.
 */
export function buildClimbingPhaseContent(
  phaseType: ClimbingPhaseType,
  discipline: Discipline,
  level: ClimberLevel
): ClimbingPhaseContentLayers {
  const content = PHASE_CONTENT[phaseType];
  const isBeginner = level === "beginner";

  const sportFocusContent =
    isBeginner && content.climbingBeginner
      ? content.climbingBeginner
      : content.climbing[discipline];

  const supplementalContent =
    isBeginner && content.supplementalBeginner
      ? content.supplementalBeginner
      : content.supplemental;

  return {
    sportFocusContent,
    supplementalContent,
    mentalGameContent: content.mentalGame,
  };
}

/**
 * Legacy wrapper. Concatenates the three layers into the format used historically
 * by `training_phases.description`. Kept for backward compatibility — any code
 * path still reading `description` continues to work unchanged.
 */
export function buildClimbingPhaseDescription(
  phaseType: ClimbingPhaseType,
  discipline: Discipline,
  level: ClimberLevel
): string {
  const layers = buildClimbingPhaseContent(phaseType, discipline, level);
  return [
    "CLIMBING FOCUS",
    layers.sportFocusContent,
    "",
    "SUPPLEMENTAL TRAINING",
    layers.supplementalContent,
    "",
    "MENTAL TRAINING",
    layers.mentalGameContent,
  ].join("\n");
}

const CLIMBING_LIMITATION_NOTES: Record<ClimbingLimitation, Record<string, string>> = {
  fingers: {
    "skill-stamina":
      "Avoid full crimping. Use open-hand grip exclusively. Tape A2 pulleys prophylactically (ring finger, middle finger) using the X-method. If any finger soreness, stop climbing and rest 2-3 days.",
    "max-strength-power":
      "No fingerboard if any finger discomfort. Reduce crimp-intensive problems. Warm up for at least 20 minutes with easy open-hand climbing before touching anything hard. Tape all sessions.",
    "anaerobic-endurance":
      "Volume is high -- finger fatigue accumulates. Drop 4x4 difficulty by one grade if finger tenderness develops. Stop immediately at any sharp pain.",
    default: "Monitor morning finger stiffness. If present, extend rest by 3-4 days.",
  },
  shoulder: {
    "skill-stamina":
      "Extra emphasis on antagonist work: push-ups, reverse flys, external rotation with band every session. If overhead positions cause pain, avoid steep overhang problems.",
    "max-strength-power":
      "No one-arm lock-offs. Reduce campus board volume. Maintain a pulling-to-pushing ratio below 2:1. Row variations (band rows, inverted rows) at the end of every session.",
    "anaerobic-endurance":
      "Monitor shoulder fatigue during high-volume sessions. If shoulder aches after climbing, apply ice for 15 min post-session and add extra external rotation work the next day.",
    default: "Shoulder prehab continues even during rest. 3x15 external rotations, 3x15 band pull-aparts, daily.",
  },
  elbow: {
    "skill-stamina":
      "Reverse wrist curls every session (3x20, light resistance). Eccentric wrist extension (slow lowering). Check that your grip is not excessively tight -- overgripping is the primary cause of elbow tendinitis in climbers.",
    "max-strength-power":
      "Continue reverse wrist curls. Avoid heavy finger rolls or grip-intensive supplemental exercises. If elbow pain increases with fingerboard work, stop fingerboard and use easy bouldering for finger stimulus instead.",
    "anaerobic-endurance":
      "Volume climbing can aggravate elbow issues. Warm up thoroughly. If pain develops during a session, stop and rest. Eccentric wrist work post-session.",
    default: "Continue daily eccentric wrist extensions. Apply heat (not ice) for chronic elbow issues -- blood flow promotes tendon repair.",
  },
  back: {
    "skill-stamina":
      "Anti-extension core work is mandatory: dead bugs, bird dogs, front planks. No heavy spinal loading. Focus on hip hinge movement patterns to take load off the lower back. Thoracic mobility work: foam roller extensions, cat-cow, thread-the-needle.",
    "max-strength-power":
      "No heavy deadlifts or barbell squats. Single-leg exercises instead (split squats, single-leg RDL). During steep bouldering, monitor for lower back compression pain -- if present, reduce session volume and increase core work.",
    "anaerobic-endurance":
      "High-volume climbing can fatigue core stabilizers, transferring load to the spine. If lower back tightens during long sessions, take a 5-minute break with gentle spinal flexion stretches.",
    default: "Daily thoracic mobility work. Gentle spinal decompression: dead hang from a bar for 30 seconds, 3x, to relieve disc compression.",
  },
  wrist: {
    "skill-stamina":
      "Rice bucket work at the end of every session (5 minutes, various wrist and finger movements). Avoid heavy mantle moves. If wrist clicks or aches, modify your crimp technique to reduce wrist extension angle.",
    "max-strength-power":
      "Reduce fingerboard volume if wrist discomfort develops. No heavy finger rolls. Wrist curls (flexion and extension) with light resistance for prehab.",
    "anaerobic-endurance":
      "Monitor wrist during high-rep traversing. Tape wrists if tenderness develops.",
    default: "Continue rice bucket daily.",
  },
};

export function buildClimbingLimitationNotes(
  phaseType: ClimbingPhaseType,
  limitations: ClimbingLimitation[]
): string | null {
  if (limitations.length === 0) return null;

  const notes: string[] = [];
  for (const lim of limitations) {
    const limNotes = CLIMBING_LIMITATION_NOTES[lim];
    const note = limNotes[phaseType] ?? limNotes.default;
    if (note) {
      notes.push(`${lim.charAt(0).toUpperCase() + lim.slice(1)}: ${note}`);
    }
  }

  return notes.length > 0 ? notes.join(" | ") : null;
}

const CYCLE_TEMPLATES: Record<
  ClimbingPeriodizationModel,
  Record<Discipline, PhaseTemplate[]>
> = {
  "4-1": {
    sport: [
      { type: "skill-stamina", weeks: 4 },
      { type: "rest", weeks: 1 },
    ],
    bouldering: [
      { type: "skill-stamina", weeks: 4 },
      { type: "rest", weeks: 1 },
    ],
  },
  "4-3-2-1": {
    sport: [
      { type: "skill-stamina", weeks: 4 },
      { type: "max-strength-power", weeks: 3 },
      { type: "anaerobic-endurance", weeks: 2 },
      { type: "rest", weeks: 1 },
    ],
    bouldering: [
      { type: "skill-stamina", weeks: 4 },
      { type: "max-strength-power", weeks: 4 },
      { type: "anaerobic-endurance", weeks: 1 },
      { type: "rest", weeks: 1 },
    ],
  },
  "3-2-1": {
    sport: [
      { type: "max-strength-power", weeks: 3 },
      { type: "anaerobic-endurance", weeks: 2 },
      { type: "rest", weeks: 1 },
    ],
    bouldering: [
      { type: "max-strength-power", weeks: 4 },
      { type: "anaerobic-endurance", weeks: 1 },
      { type: "rest", weeks: 1 },
    ],
  },
};

const GRADE_ORDER = [
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+",
];

function gradeToLevel(grade: string): ClimberLevel {
  const idx = GRADE_ORDER.indexOf(grade);
  if (idx < 0 || idx <= 5) return "beginner";
  if (idx <= 12) return "intermediate";
  return "advanced";
}

function experienceToLevel(years: number): ClimberLevel {
  if (years < 2) return "beginner";
  if (years <= 5) return "intermediate";
  return "advanced";
}

const LEVEL_RANK: Record<ClimberLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const MODEL_FOR_LEVEL: Record<ClimberLevel, ClimbingPeriodizationModel> = {
  beginner: "4-1",
  intermediate: "4-3-2-1",
  advanced: "3-2-1",
};

const LEVEL_EXPLANATIONS: Record<ClimberLevel, string> = {
  beginner:
    "Beginners benefit most from skill acquisition and volume climbing. " +
    "Tendons are not yet adapted to high loads, so structured strength training is premature.",
  intermediate:
    "Intermediate climbers benefit from structured periodization that separates stimulus types " +
    "to prevent overtraining and allow targeted adaptation.",
  advanced:
    "Advanced climbers have strong base fitness and benefit from focused strength/power phases " +
    "with shorter cycles and higher training density.",
};

/**
 * Derives climber level from grade and experience.
 * Takes the conservative (lower) of grade-based and experience-based levels
 * to ensure safety — a V8 climber with 1 year of experience should not
 * be hangboarding.
 */
export function assessLevel(
  maxBoulderGrade: string,
  maxSportGrade: string,
  yearsExperience: number
): LevelAssessment {
  const boulderLevel = gradeToLevel(maxBoulderGrade);
  const sportLevel = gradeToLevel(maxSportGrade);
  const expLevel = experienceToLevel(yearsExperience);

  const gradeLevel =
    LEVEL_RANK[boulderLevel] <= LEVEL_RANK[sportLevel]
      ? boulderLevel
      : sportLevel;

  const derivedLevel =
    LEVEL_RANK[gradeLevel] <= LEVEL_RANK[expLevel] ? gradeLevel : expLevel;

  const recommendedModel = MODEL_FOR_LEVEL[derivedLevel];

  const explanation =
    `Your grades (${maxBoulderGrade}, ${maxSportGrade}) and ${yearsExperience} year(s) of experience ` +
    `place you at the ${derivedLevel} level. ${LEVEL_EXPLANATIONS[derivedLevel]}`;

  return { derivedLevel, recommendedModel, explanation };
}

/**
 * Generates an ordered list of training phases for a periodization cycle.
 * Pure function — no side effects, no DB access.
 */
export function generatePhases(
  level: ClimberLevel,
  discipline: Discipline,
  physicalLimitations: ClimbingLimitation[],
  startDate: string
): GeneratedPhase[] {
  const model = MODEL_FOR_LEVEL[level];
  const templates = CYCLE_TEMPLATES[model][discipline];
  const phases: GeneratedPhase[] = [];

  let currentDate = new Date(startDate + "T00:00:00");

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const phaseStart = format(currentDate, "yyyy-MM-dd");
    const phaseEnd = format(
      addWeeks(currentDate, t.weeks),
      "yyyy-MM-dd"
    );

    const layers = buildClimbingPhaseContent(t.type, discipline, level);
    phases.push({
      phaseType: t.type,
      orderIndex: i,
      durationWeeks: t.weeks,
      startDate: phaseStart,
      endDate: phaseEnd,
      description: buildClimbingPhaseDescription(t.type, discipline, level),
      sportFocusContent: layers.sportFocusContent,
      supplementalContent: layers.supplementalContent,
      mentalGameContent: layers.mentalGameContent,
      limitationNotes: buildClimbingLimitationNotes(t.type, physicalLimitations),
    });

    currentDate = addWeeks(currentDate, t.weeks);
  }

  return phases;
}

export function getPhaseDisplayName(phaseType: string): string {
  const names: Record<string, string> = {
    "skill-stamina": "Skill & Stamina",
    "max-strength-power": "Max Strength & Power",
    "anaerobic-endurance": "Anaerobic Endurance",
    rest: "Rest",
    "foundation-prehab": "Foundation & Prehab",
    "strength-power": "Strength & Power",
    "tennis-endurance": "Tennis-Specific Endurance",
    performance: "Performance",
    recovery: "Recovery",
    "base-building": "Base Building",
    development: "Development",
    "race-prep": "Race Prep & Taper",
    "base-injury-prevention": "Base & Injury Prevention",
    "strength-endurance": "Strength & Endurance",
    "speed-specificity": "Speed & Specificity",
    "taper-race": "Taper & Race",
  };
  return names[phaseType] ?? phaseType;
}

export function getCycleTotalWeeks(
  level: ClimberLevel,
  discipline: Discipline
): number {
  const model = MODEL_FOR_LEVEL[level];
  return CYCLE_TEMPLATES[model][discipline].reduce(
    (sum, t) => sum + t.weeks,
    0
  );
}

export { GRADE_ORDER };
