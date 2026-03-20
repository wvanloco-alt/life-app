import type {
  RunnerLevel,
  RunningGoalDistance,
  RunningPhaseType,
  RunningLimitation,
  RunningPeriodizationModel,
  LevelAssessment,
} from "@/types";
import type { GeneratedPhase } from "./periodization";
import { addWeeks, format } from "date-fns";

interface RunningPhaseTemplate {
  type: RunningPhaseType;
  weeks: number;
}

type BeginnerPhase = "base-building" | "development" | "race-prep" | "rest";
type IntAdvPhase = "base-injury-prevention" | "strength-endurance" | "speed-specificity" | "taper-race" | "rest";

interface PhaseContent {
  running: string;
  runningBeginner?: string;
  supplemental: string;
  supplementalBeginner?: string;
  mental: string;
  mentalBeginner?: string;
}

type DistanceModifiers = Record<RunningGoalDistance, string>;

interface RunningPhaseContentEntry {
  beginner?: PhaseContent;
  intermediate?: PhaseContent;
  advanced?: PhaseContent;
  all?: PhaseContent;
  distanceModifiers?: Partial<Record<RunnerLevel, DistanceModifiers>>;
}

// ─── Phase Content ──────────────────────────────────────

const BEGINNER_PHASE_CONTENT: Record<BeginnerPhase, PhaseContent> = {
  "base-building": {
    running:
      "Your only job is to build the habit and let your body adapt. Start with run/walk intervals if you cannot yet sustain 30 minutes of continuous running: 1 minute running / 2 minutes walking × 8–10 reps (24–30 minutes total). Progress by increasing run intervals and decreasing walk intervals over 2–3 weeks until you can run continuously for 30 minutes.\n\nOnce you can run 30 minutes continuously, run 3 days per week at easy pace — Zone 1–2, conversational. You should be able to hold a full conversation. If you cannot, slow down. Yes, slower than that. Add strides (4–6 × 80m accelerations with full recovery) after one easy run per week starting in week 4. Introduce a longer run on the weekend: start at 35 minutes and add 5 minutes per week.\n\nDo not add distance to more than one run per week. Do not increase total weekly volume by more than 10–15 minutes per week. Your cardiovascular system adapts in weeks; your tendons and bones need months. The aerobic system will feel ready long before the connective tissue is. Trust the process.",
    supplemental:
      "Strength work twice per week, 20 minutes each. Focus on the running kinetic chain: glute bridges (3×12), bodyweight squats (3×12), single-leg balance (3×30sec/leg), standing calf raises (3×15, slow 3-second lowering — this is Achilles prehab), plank (3×30sec), side plank (3×20sec/side). No heavy loading. The goal is activation and stability, not strength building. Add bird dogs (3×8/side) for thoracic spine and core integration.",
    mental:
      "Building the identity: You are not \"trying to become a runner.\" You are a runner who is currently building a base. This distinction matters because identity drives behavior. After every run, regardless of distance or pace, you have evidence: \"I ran today. I am a runner.\" Collect evidence. Do not set performance expectations. The only metric that matters in this phase is consistency: did you show up? Consistency over intensity — no hero days, just show up and let it compound.",
  },
  development: {
    running:
      "You now have an aerobic base. Time to introduce one quality session per week while maintaining everything else as easy running.\n\nQuality session options (pick one per week):\n• Fartlek: During an easy run, add 4–6 surges of 30–60 seconds at a pace that feels \"comfortably hard\" (you can speak in short sentences but not hold a conversation). Jog easy for 2 minutes between surges. This is speed play — no watch-staring, no precise paces. Run by feel.\n• Tempo effort: After a 10-minute warm-up, run 10–15 minutes at a pace you could hold for about an hour (roughly Zone 3–4). Cool down with 10 minutes easy. Extend by 2 minutes every 2 weeks.\n\nMaintain 3–4 runs per week. Long run continues to extend: aim for 60–75 minutes by the end of this phase. All other runs remain easy (Zone 1–2). The 80/20 rule applies: at least 80% of your weekly running time should be easy.",
    supplemental:
      "Continue twice-weekly strength work. Progress to: split squats (3×10/leg), single-leg calf raises (3×12/leg, slow lowering), Romanian deadlift with light weight or bodyweight (3×10), plank (3×45sec), side plank (3×30sec/side), dead bugs (3×8/side). This is the minimum effective dose for injury prevention. It takes 20 minutes. It is not optional.",
    mental:
      "Effort awareness: Learn to distinguish between discomfort (normal and productive) and pain (a signal to stop). During your quality session, practice rating your effort on a 1–10 scale at the halfway point. Easy runs should be 3–4. Tempo efforts should be 6–7. Anything above 8 in this phase means you are going too hard. Fartlek surges can touch 7–8 briefly.\n\nThis is the running equivalent of nonjudgmental awareness: notice what your body is telling you without judging it. \"My legs feel heavy at effort 6\" is data. \"I'm so unfit\" is narrative. Collect the data.",
  },
  "race-prep": {
    running:
      "If you have a target race: reduce total volume by 20–30% compared to the Development phase. Drop the number of runs per week by one, or shorten your easy runs. Keep one quality session per week but reduce its duration by one third. Do one race-pace effort 7–10 days before the race: run 10–15 minutes at your target race pace to calibrate effort.\n\nFinal week: run only 2–3 times, all short and easy. One set of strides 2 days before the race. Rest the day before.\n\nIf no race target: this phase is a consolidation week. Reduce volume by 30%, maintain one short quality session, and use the extra recovery to let connective tissue catch up.",
    supplemental:
      "Reduce to once per week. Same exercises, 2 sets instead of 3. No new exercises. No heavy loading. The body is consolidating, not building.",
    mental:
      "Pre-race process: Establish your race-day routine before race day. Decide: what will you eat for breakfast? What will you wear? When will you arrive? What will your warm-up be? Having a plan eliminates decision fatigue and anxiety. This is the running equivalent of a pre-performance ritual — a sequence that shifts your brain from thinking to doing.\n\nIf no race: use this phase to set your next goal. What distance? What timeline? The taper is also a planning phase for the next cycle.",
  },
  rest: {
    running:
      "No structured running. If you run, keep it to 20–30 minutes at the easiest possible effort — jog, walk, enjoy being outside. No pace targets, no distance goals. Walk if you want. Swim. Cycle. Hike. Do yoga.\n\nThis is where supercompensation happens. Your connective tissue — tendons, ligaments, bone — recovers 2–3× slower than your cardiovascular system. If you cut rest short, the aerobic engine feels ready but the structural system is not. This is when overuse injuries happen.",
    supplemental:
      "No structured training. Light stretching and foam rolling only. If you have been doing calf work consistently, you can take a full week off. Post-rest assessment: any Achilles stiffness? Knee soreness? Shin tenderness? If yes, extend rest by 3–4 days before starting the next cycle.",
    mental:
      "Process review: At the end of the rest phase, review the completed cycle. What went well? Where did you skip sessions? What triggered the skips — was it an unstructured evening, a broken streak that spiraled, or simply life? This is data collection, not self-criticism. Write down 3 things you will do differently in the next cycle and 3 things you will keep doing.\n\nReconnect with why you run. Is it for the race time, the morning clarity, the physical challenge, the proof that you showed up? If running felt like a chore in the last cycle, something needs to change — route, time of day, company, or expectations. If the process is miserable, you will quit. Keep it enjoyable.",
  },
};

const INTERMEDIATE_PHASE_CONTENT: Record<IntAdvPhase, PhaseContent> = {
  "base-injury-prevention": {
    running:
      "Rebuild the aerobic engine. All runs are easy (Zone 1–2) except strides. Run 4–5 times per week, building toward your target weekly volume over 4–6 weeks. Increase total weekly volume by no more than 10–15% per week. Include one long run per week, building from 60 minutes toward 75–90 minutes.\n\nAdd strides after 2–3 easy runs per week: 4–6 × 100m at 90% effort with full walking recovery. Strides improve neuromuscular coordination and leg turnover without adding fatigue. They are not sprints — build speed smoothly over the first 50m, hold for 30m, decelerate over the final 20m.\n\nIf coming from a break or a previous training cycle, start at 70% of your previous peak volume and build back. Do not resume where you left off — your connective tissue has detrained even if your aerobic system remembers.",
    supplemental:
      "Twice weekly, 25–30 minutes. This is where you build the structural resilience that prevents injury in later phases. Single-leg deadlift (3×8/leg), split squat (3×10/leg), step-ups (3×10/leg), standing calf raise — straight knee (3×12, slow eccentric), seated calf raise — bent knee (3×12, slow eccentric — targets soleus, critical for Achilles health), plank (3×45sec), side plank (3×30sec/side), dead bugs (3×10/side).\n\nAdd hip stability work: clamshells (3×15/side), lateral band walks (3×10 steps/direction). These prevent the hip-drop pattern that causes runner's knee and IT band syndrome.",
    mental:
      "Zone 2 discipline: The hardest mental skill for intermediate runners is running easy enough on easy days. Your ego will resist. Running slowly feels wrong when you \"know\" you can go faster. But the 80/20 principle is not a suggestion — it is how every elite endurance athlete in the world trains (Seiler's research). Practice treating easy pace as a skill, not a limitation. Use heart rate if you need external accountability: if your heart rate drifts above Zone 2, slow down. No exceptions.\n\nThis is the running version of \"sharpen the saw\" — going slow today makes you fast tomorrow. Cutting the slow runs short is sawing with a dull blade.",
  },
  "strength-endurance": {
    running:
      "Introduce one quality session per week. The other runs remain easy (Zone 1–2). Long run continues to extend.\n\nWeekly structure (4–5 runs):\n• 1× Quality session (see below)\n• 1× Long run (easy pace, extending by 10 minutes every 2 weeks)\n• 2–3× Easy runs with optional strides after 1–2 of them\n\nQuality session options (alternate weekly):\n• Tempo run: After 10-minute warm-up, run 20–30 minutes at threshold pace (the fastest pace you could hold for about an hour — roughly Zone 4). Cool down 10 minutes easy. This is \"comfortably hard\" — you can say a few words but not sentences.\n• Hill repeats: Find a hill with moderate gradient (4–6%). After warm-up, run hard uphill for 60–90 seconds, jog back down for recovery, repeat 4–8 times. Cool down easy. Hills build leg power and running economy without the impact stress of flat speedwork.\n• Cruise intervals: 3–4 × 8 minutes at threshold pace with 2-minute easy jog recovery. Total quality time: 24–32 minutes. These are Daniels' bread-and-butter threshold workout.",
    supplemental:
      "Continue twice weekly. Progress loading: add weight to split squats and single-leg deadlifts (dumbbells or kettlebell). Maintain calf work (straight and bent knee variants). Add: Romanian deadlift with moderate load (3×8), single-leg hop and hold (3×5/leg — introduces elastic loading for tendons).\n\nCore work shifts slightly toward anti-rotation: Pallof press (3×10/side), bird dog with slow tempo (3×8/side).",
    mental:
      "Managing the quality session: Quality sessions are where the mental game gets real. The tempo run will feel uncomfortable — that is the point. Practice the two-arrow framework: the first arrow is the physical sensation (burning legs, heavy breathing). The second arrow is the story you tell yourself about it (\"I can't do this,\" \"I'm dying\"). Suffering comes from the second arrow.\n\nWhen the tempo run gets hard at minute 18, observe the sensation without narrating: \"Legs feel heavy, breathing is elevated, effort is about 7/10.\" That is data. Do not add \"and I should probably stop.\" You are gathering information, not passing verdicts.",
  },
  "speed-specificity": {
    running:
      "Two quality sessions per week. This is the most demanding phase. The other runs must be genuinely easy — if you are not recovering between quality sessions, you are running your easy days too hard.\n\nWeekly structure (4–5 runs):\n• 1× Interval session\n• 1× Threshold session (tempo or cruise intervals)\n• 1× Long run (easy pace, maintaining peak distance)\n• 1–2× Easy runs\n\nInterval session options:\n• VO2max intervals: 4–6 × 800m–1200m at roughly 5K race pace (Zone 5) with equal-time jog recovery. Example: 5 × 1000m at 5K pace with 3-minute jog. This is hard — perceived effort 8–9/10.\n• Short repeats: 8–10 × 400m at 3K–5K pace with 90-second recovery. Builds speed and running economy.\n• Fartlek with structure: 6–8 × 2 minutes hard / 2 minutes easy. Less psychologically daunting than track intervals but physiologically similar.",
    supplemental:
      "Maintain twice weekly but reduce volume by 20%. The running load is higher — you do not want to fatigue legs with heavy strength work before a quality session. Drop to 2 sets per exercise. Maintain calf work and hip stability. No new exercises.\n\nSchedule strength work the day after a quality session (when you're doing an easy run anyway) or on a rest day — never the day before a quality session.",
    mental:
      "Segmenting and process focus: During intervals, do not think about the total number of reps remaining. Think only about this rep. When rep 3 of 6 feels terrible, the thought \"I still have 3 more\" is catastrophizing. Replace it with a process cue: \"Relax shoulders. Quick feet. Breathe.\" Give your conscious mind a useful job so your body can do the running.\n\nBetween reps, do not analyze your split time. Just jog, breathe, and start the next one when it is time. The workout teaches your body to produce speed on demand. The mental skill is letting it happen without interference.",
  },
  "taper-race": {
    running:
      "Reduce total volume by 20–40% compared to the Speed & Specificity phase. Drop to 3–4 runs per week. Keep one quality session per week but shorten it significantly: if your intervals were 5 × 1000m, do 3 × 800m. If your tempo was 30 minutes, do 15 minutes. The intensity stays the same — only the volume drops.\n\nWeek-by-week taper (3-week taper):\n• Week 1: 75% of peak volume. One shortened quality session. Long run at 70% of peak distance.\n• Week 2: 60% of peak volume. One very short quality session (3–4 reps of something fast). No long run — replace with a moderate easy run.\n• Race week: 40% of peak volume. 2–3 short easy runs. One set of strides 2 days before the race. Complete rest the day before.\n\nRace-day warm-up: 10 minutes easy jogging, 4 strides, 5 minutes rest before start.",
    supplemental:
      "Once per week or stop entirely. Light maintenance only. No new stimuli. The body is absorbing the training from previous phases — let it.",
    mental:
      "Trust the training: The taper makes you anxious. You will feel flat, sluggish, and undertrained. This is normal — your body is supercompensating, rebuilding stronger than it was during peak training. The urge to squeeze in \"one more hard session\" is your conscious mind panicking. Ignore it.\n\nEstablish your race-day process: warm-up routine, starting pace, when to push, what to do when it gets hard (which process cue will you use?). Visualize the race — not the outcome, but the process. See yourself running relaxed at mile 1, managing effort at the halfway point, finishing strong. This is not magical thinking; it is mental rehearsal.",
  },
  rest: {
    running: BEGINNER_PHASE_CONTENT.rest.running,
    supplemental: BEGINNER_PHASE_CONTENT.rest.supplemental,
    mental: BEGINNER_PHASE_CONTENT.rest.mental,
  },
};

const ADVANCED_PHASE_CONTENT: Record<IntAdvPhase, PhaseContent> = {
  "base-injury-prevention": {
    running:
      "Build toward peak mileage. Run 5–7 times per week, targeting 50–70+ km/week by the end of this phase. All runs are easy (Zone 1–2) except strides. If volume exceeds 60 km/week, consider introducing doubles: two shorter runs in a day (e.g., 40 minutes morning + 25 minutes evening) instead of one longer run. Doubles distribute the training stress and allow higher total volume with less per-session impact.\n\nAdd strides after every easy run: 6 × 100m at 90% effort with full walking recovery. At this level, strides are not a special addition — they are a daily staple that maintains neuromuscular sharpness throughout the base phase.\n\nInclude one long run per week, building from 75 minutes toward 100–120 minutes. If coming from a break, start at 60% of previous peak volume and rebuild over 4–6 weeks. Advanced runners detrain slower than beginners but connective tissue still needs a ramp.",
    supplemental:
      "Twice weekly, 30 minutes. Progress all movements with external load: split squat with dumbbells (3×8/leg), single-leg deadlift with kettlebell (3×8/leg), step-ups with load (3×8/leg), calf raises — straight and bent knee (3×12 each, with added weight), hip thrust or barbell glute bridge (3×10). Core: Pallof press (3×10/side), dead bugs with slow tempo (3×10/side), Copenhagen plank (3×15sec/side).\n\nAt this level, strength work is not about learning movement patterns — it is about maintaining structural capacity under high mileage. If you are running 60+ km/week without strength work, you are accumulating a debt that will be paid in injury.",
    mental:
      "Patience with the base: Advanced runners are the most likely to cut the base phase short because they \"already have a base.\" You do — from the last cycle. But every new cycle requires rebuilding, and the first quality sessions on a weak base produce inferior adaptation. Treat the base phase as the investment that pays dividends in every subsequent phase. Lydiard's athletes built their base for 12 weeks. Your 4–6 weeks is already a compression.\n\nRun without a watch for at least one easy run per week. Let your body set the pace. If you cannot run easy without checking your watch, you are training your anxiety, not your aerobic system.",
  },
  "strength-endurance": {
    running:
      "Two quality sessions per week from the start of this phase. This is where the advanced plan diverges most from intermediate — you are adding a second quality session earlier because your body can handle the load and recovery.\n\nWeekly structure (5–7 runs):\n• 1× Threshold session (see below)\n• 1× Hill or strength-endurance session (see below)\n• 1× Long run (see below)\n• 2–4× Easy runs with strides\n\nThreshold session options:\n• Tempo run: 25–40 minutes at threshold pace (Zone 4). Cool down easy. Advanced runners should aim for the upper end of this range. If you can comfortably hold 30 minutes at threshold, extend to 35, then 40.\n• Cruise intervals: 4–5 × 10 minutes at threshold pace with 2-minute easy jog recovery. Total quality time: 40–50 minutes.\n\nHill / strength-endurance session options:\n• Hill repeats: 6–10 × 90-second hill efforts on a 5–8% gradient, jog back down for recovery. These are longer and steeper than intermediate. Focus on driving the knees and maintaining form as fatigue builds.\n• Progression long run: Start easy, finish the last 30% at threshold pace. This teaches your body to run fast on tired legs — the exact skill needed in the second half of any race.\n\nLong run: Builds to 100–120 minutes. For marathon goals, include marathon-pace segments in the second half: run the last 30–40 minutes at projected marathon pace.",
    supplemental:
      "Continue twice weekly. Maintain external loading. Focus shifts slightly toward power: add single-leg hop progressions (3×6/leg), box jumps or depth jumps (3×5 — plyometric loading develops tendon stiffness and elastic recoil). Maintain calf work — at high mileage, calves need permanent attention. Keep hip stability exercises (lateral band walks, clamshells) even though they feel easy — they maintain the motor patterns that prevent form breakdown under fatigue.",
    mental:
      "The second quality session: Two hard sessions per week means your easy days must be genuinely easy. The temptation for advanced runners is to run every day at moderate effort — Zone 3, the gray zone. This is the single most common error at this level. Seiler's research is unambiguous: the 80/20 distribution produces better results than a 50/50 distribution, even when total training time is equal.\n\nMonitor yourself honestly: if your \"easy\" runs are consistently above Zone 2, you are not following polarized training — you are doing threshold training with extra fatigue. Slow down. The discipline to run slowly is harder than the discipline to run fast.",
  },
  "speed-specificity": {
    running:
      "Two quality sessions per week with higher volume within each session. This is the peak training phase — the highest combined intensity and volume of the cycle.\n\nWeekly structure (5–7 runs):\n• 1× Interval session\n• 1× Threshold session (tempo or cruise intervals)\n• 1× Long run (maintaining peak distance)\n• 2–4× Easy runs with strides\n\nInterval session options:\n• VO2max intervals: 6–8 × 1000m at 3K–5K race pace (Zone 5) with equal-time jog recovery. This is higher volume than intermediate (4–6 reps). Example: 7 × 1000m at 5K pace with 3-minute jog recovery. Total quality time: ~25 minutes at VO2max intensity.\n• Short repeats: 10–12 × 400m at 3K pace with 90-second recovery. Builds speed, running economy, and neuromuscular recruitment.\n• Mixed session: 3 × 1600m at 10K pace, then 4 × 400m at 3K pace. Combines endurance and speed stimulus in one workout.\n\nThreshold session options:\n• Extended tempo: 35–45 minutes at threshold pace. Advanced runners should be able to sustain 40+ minutes. This is a demanding workout — do not schedule it the day after intervals.\n• Race simulation: Run at goal race pace for 60–75% of race distance. For a 10K runner: 6–7 km at 10K pace. For a half-marathon runner: 12–14 km at half-marathon pace.\n\nLong run: Maintain peak distance. For marathon goals, continue alternating between easy long runs and marathon-pace long runs. For shorter distances, keep long runs easy but include 4–6 strides in the middle for neuromuscular activation.",
    supplemental:
      "Reduce to twice weekly with 2 sets per exercise. The running volume is at its peak — supplemental work maintains what was built in earlier phases without adding fatigue. No new exercises. Schedule strength work on easy days only — never the day before intervals or tempo. If recovery feels compromised, drop to once per week. Maintain calf work and hip stability regardless of volume reduction.",
    mental:
      "Racing the workout: Advanced interval sessions are genuinely hard — perceived effort 8–9/10 for sustained periods. This is where the mental game separates strong runners from fast runners. Two skills matter:\n\nFirst, commit to the pace. Do not start conservative and \"see how it goes.\" Start at the prescribed pace from rep 1. If you blow up, you learn something. If you hold on, you build confidence. Half-committed efforts produce half-committed results.\n\nSecond, embrace the discomfort without dramatizing it. Rep 5 of 7 at 5K pace hurts. The sensation is burning legs, labored breathing, a body that wants to stop. That is accurate. The narrative \"I am dying and cannot finish\" is not accurate — you have finished before and you will finish again. Observe the sensation. Run the rep. Move to the next one.",
  },
  "taper-race": {
    running:
      "Reduce total volume by 30–50% compared to the Speed & Specificity phase. The drop is more dramatic than intermediate because the peak volume was higher. Drop to 4–5 runs per week. Keep one quality session per week but reduce it substantially: if your intervals were 7 × 1000m, do 4 × 800m. If your tempo was 40 minutes, do 20 minutes. Intensity stays the same — volume drops.\n\nWeek-by-week taper (3-week taper):\n• Week 1: 70% of peak volume. One shortened quality session (60% of normal interval/tempo volume). Long run at 60% of peak distance.\n• Week 2: 50% of peak volume. One short, sharp quality session (4 × 400m at goal pace or 15-minute tempo). No long run — moderate easy run instead.\n• Race week: 35% of peak volume. 3–4 short easy runs (25–35 min). One set of 6 strides 2 days before the race. Complete rest the day before.\n\nRace-day warm-up: 15 minutes easy jogging, 6 strides, dynamic stretching, 5 minutes rest before start.",
    supplemental:
      "Stop structured strength work. Light mobility and stretching only. The body is consolidating adaptations from the entire training cycle. Adding any new stimulus — even seemingly light work — risks introducing soreness or fatigue that undermines race performance.",
    mental:
      "Pre-race visualization: Advanced runners know the discomfort that is coming. Use that knowledge. Visualize specific moments: the start (controlled, not too fast), the middle (managing effort, staying relaxed), the hard patch (it will come — what will you do when it arrives?), the finish (you have trained for this and you are ready).\n\nThe taper anxiety is worse for experienced runners because you know what fitness feels like, and the taper does not feel like fitness. It feels like detraining. It is not. Every study on tapering shows performance improvements of 2–3% after a proper taper. You are not losing fitness — you are removing fatigue to reveal the fitness underneath. Trust the process.",
  },
  rest: {
    running: BEGINNER_PHASE_CONTENT.rest.running,
    supplemental: BEGINNER_PHASE_CONTENT.rest.supplemental,
    mental: BEGINNER_PHASE_CONTENT.rest.mental,
  },
};

// ─── Limitation Notes ───────────────────────────────────

type PhaseGroupKey = "base" | "development" | "speed" | "taper-rest";

function phaseToGroup(phaseType: RunningPhaseType): PhaseGroupKey {
  switch (phaseType) {
    case "base-building":
    case "base-injury-prevention":
      return "base";
    case "development":
    case "strength-endurance":
      return "development";
    case "race-prep":
    case "speed-specificity":
      return "speed";
    case "taper-race":
    case "rest":
      return "taper-rest";
  }
}

const RUNNING_LIMITATION_NOTES: Record<RunningLimitation, Record<PhaseGroupKey, string>> = {
  achilles: {
    base: "Eccentric calf raises (straight and bent knee) every session, minimum 3×12 per variant, slow 3-second lowering. Warm up with 5 minutes of walking before every run. If morning stiffness lasts more than 10 minutes, reduce volume for 3 days. Footwear rotation: alternate between at least 2 pairs.",
    development: "Monitor Achilles response to tempo runs. If tendon soreness appears after quality sessions, drop back to easy runs only for 3–4 days. Continue eccentric calf work. No sudden increases in hill running volume — hills load the Achilles more than flat terrain.",
    speed: "Intervals increase Achilles loading. Warm up thoroughly (10 min easy + strides before any fast work). If any session produces Achilles pain >3/10, stop immediately and return to easy running for 48 hours. Continue eccentric calf work.",
    "taper-rest": "Calf work continues even during taper and rest — this is permanent maintenance. Post-rest assessment: check morning Achilles stiffness. If present, extend rest by 3–4 days.",
  },
  knee: {
    base: "Glute activation is priority #1: clamshells, glute bridges, and lateral band walks every run day. Single-leg balance (30sec/leg) to build knee stability. Monitor for pain during or after stairs.",
    development: "Hill running may increase knee loading on the descent. If knee pain appears during downhill segments, avoid steep descents and use a flatter route. Continue glute work.",
    speed: "High-speed intervals can stress the patellofemoral joint. If knee aches after interval sessions, apply ice for 15 minutes post-session and increase glute/quad strengthening.",
    "taper-rest": "Reduced volume should help knee symptoms. If pain persists during rest, consult a physiotherapist before starting the next cycle. Continue glute exercises.",
  },
  shin: {
    base: "Run on softer surfaces (grass, trail, treadmill) when possible. Anterior tibialis strengthening: toe raises against a wall (3×20). Do not increase weekly volume by more than 10%. If shin pain develops, reduce to run/walk intervals for 1 week.",
    development: "Monitor shins during tempo runs. Shorten stride slightly if shin tenderness develops. Continue toe raises.",
    speed: "Track running (hard surface) can aggravate shins. Run intervals on grass or soft trail if available.",
    "taper-rest": "Reduced volume resolves most shin issues. If pain persists into rest, extend rest by 1 week.",
  },
  "plantar-fascia": {
    base: "Morning foot mobility routine: roll a frozen water bottle under the arch for 5 minutes before your first steps. Calf stretching (30sec × 3, both straight and bent knee) after every run. Towel curls (scrunch a towel with your toes, 3×10) for foot strength. Assess arch support in your running shoes.",
    development: "If heel pain increases after tempo runs, reduce quality session intensity for 1 week. Continue calf stretching and foot strengthening daily.",
    speed: "Speed work increases plantar fascia loading. Warm up with 5–10 minutes of easy running and foot mobilizations before any fast work.",
    "taper-rest": "Continue daily calf stretching and foot rolling. Do not introduce new shoes or orthotics close to race day.",
  },
  back: {
    base: "Anti-extension core work is mandatory: dead bugs (3×10/side), bird dogs (3×8/side), front planks (3×45sec). No heavy spinal loading in strength work (no barbell squats or deadlifts — use single-leg alternatives). Thoracic mobility work: foam roller extensions (2 min), cat-cow (10 reps), thread-the-needle (5/side). Chest stretches (doorway stretch, 30sec × 2).",
    development: "Monitor posture fatigue on runs longer than 60 minutes. If lower back tightens or upper back rounds noticeably, take a 1-minute walk break to reset posture. Core exercises continue every strength session.",
    speed: "Fast running demands more trunk extension, which fatigues faster with Scheuermann's. During intervals, reset posture between reps: stand tall, shoulders back, one deep breath.",
    "taper-rest": "Daily thoracic mobility work. Gentle spinal decompression: dead hang from a bar for 30 seconds × 3 to relieve disc compression.",
  },
  "hip-adductor": {
    base: "Progressive lateral work: lateral band walks (start with light band, 3×10 steps/direction). Copenhagen plank if tolerated (3×10sec/side, building to 20sec). Stop at any groin discomfort — do not push through adductor pain.",
    development: "Do not introduce steep hill repeats suddenly — hill running loads the hip adductors more than flat terrain. Build hill volume over 2–3 weeks. Monitor for groin tightness after tempo runs.",
    speed: "Speed work with direction changes (fartlek on trails) can stress adductors. If groin tightness develops, switch to flat, straight-line running for quality sessions.",
    "taper-rest": "Reduced volume should help. Continue gentle adductor stretching (seated butterfly, 30sec × 3). If discomfort persists, extend rest.",
  },
};

// ─── Phase Templates ────────────────────────────────────

const BEGINNER_TEMPLATE: RunningPhaseTemplate[] = [
  { type: "base-building", weeks: 8 },
  { type: "development", weeks: 6 },
  { type: "race-prep", weeks: 3 },
  { type: "rest", weeks: 1 },
];

const DISTANCE_MODIFIERS_INTERMEDIATE: Record<RunningGoalDistance, number[]> = {
  "5k": [4, 4, 6, 2],
  "10k": [4, 4, 6, 2],
  "half-marathon": [5, 5, 5, 3],
  marathon: [6, 6, 4, 3],
  general: [5, 5, 4, 2],
};

const DISTANCE_MODIFIERS_ADVANCED: Record<RunningGoalDistance, number[]> = {
  "5k": [4, 4, 6, 2],
  "10k": [4, 4, 6, 2],
  "half-marathon": [5, 5, 5, 3],
  marathon: [6, 6, 5, 3],
  general: [5, 5, 4, 2],
};

const INT_ADV_PHASE_ORDER: IntAdvPhase[] = [
  "base-injury-prevention",
  "strength-endurance",
  "speed-specificity",
  "taper-race",
];

// ─── Level Assessment ───────────────────────────────────

function frequencyToLevel(runsPerWeek: number): RunnerLevel {
  if (runsPerWeek <= 3) return "beginner";
  if (runsPerWeek <= 5) return "intermediate";
  return "advanced";
}

function experienceToLevel(years: number): RunnerLevel {
  if (years < 1) return "beginner";
  if (years <= 3) return "intermediate";
  return "advanced";
}

const LEVEL_RANK: Record<RunnerLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const MODEL_FOR_LEVEL: Record<RunnerLevel, RunningPeriodizationModel> = {
  beginner: "3-phase",
  intermediate: "4-phase",
  advanced: "4-phase",
};

const LEVEL_EXPLANATIONS: Record<RunnerLevel, string> = {
  beginner:
    "Beginners need to build the habit, develop connective tissue resilience, and establish an aerobic base " +
    "before any quality work. The 3-phase model focuses on gradual volume building with one quality session " +
    "introduced only in the Development phase.",
  intermediate:
    "Intermediate runners benefit from structured 4-phase periodization that separates base building, " +
    "strength development, speed work, and race preparation. One to two quality sessions per week.",
  advanced:
    "Advanced runners use a 4-phase model with higher volume, more quality sessions from earlier in the cycle, " +
    "and longer phases. The training load demands disciplined recovery on easy days.",
};

export function assessRunningLevel(
  runsPerWeek: number,
  yearsExperience: number,
  canRun30MinContinuous: boolean,
  hasRaced: boolean
): LevelAssessment {
  if (!canRun30MinContinuous) {
    const model = MODEL_FOR_LEVEL.beginner;
    return {
      derivedLevel: "beginner",
      recommendedModel: model,
      cycleLengthWeeks: BEGINNER_TEMPLATE.reduce((s, t) => s + t.weeks, 0),
      explanation:
        "Cannot yet sustain 30 minutes of continuous running — building that base is the first priority. " +
        LEVEL_EXPLANATIONS.beginner,
    };
  }

  const freqLevel = frequencyToLevel(runsPerWeek);
  const expLevel = experienceToLevel(yearsExperience);
  let derived: RunnerLevel =
    LEVEL_RANK[freqLevel] <= LEVEL_RANK[expLevel] ? freqLevel : expLevel;

  if (derived === "advanced" && !hasRaced) {
    derived = "intermediate";
  }

  const model = MODEL_FOR_LEVEL[derived];

  let totalWeeks: number;
  if (derived === "beginner") {
    totalWeeks = BEGINNER_TEMPLATE.reduce((s, t) => s + t.weeks, 0);
  } else {
    const modifiers =
      derived === "advanced"
        ? DISTANCE_MODIFIERS_ADVANCED.general
        : DISTANCE_MODIFIERS_INTERMEDIATE.general;
    totalWeeks = modifiers.reduce((s, w) => s + w, 0) + 1;
  }

  const explanation =
    `Running ${runsPerWeek} times per week with ${yearsExperience} year(s) of consistent experience` +
    (hasRaced ? " and race history" : "") +
    ` places you at the ${derived} level. ${LEVEL_EXPLANATIONS[derived]}`;

  return {
    derivedLevel: derived,
    recommendedModel: model,
    cycleLengthWeeks: totalWeeks,
    explanation,
  };
}

// ─── Phase Description Builder ──────────────────────────

export function buildRunningPhaseDescription(
  phaseType: RunningPhaseType,
  goalDistance: RunningGoalDistance,
  level: RunnerLevel
): string {
  let content: PhaseContent;

  if (level === "beginner") {
    content = BEGINNER_PHASE_CONTENT[phaseType as BeginnerPhase];
  } else if (level === "advanced") {
    content = ADVANCED_PHASE_CONTENT[phaseType as IntAdvPhase];
  } else {
    content = INTERMEDIATE_PHASE_CONTENT[phaseType as IntAdvPhase];
  }

  if (!content) {
    content = BEGINNER_PHASE_CONTENT.rest;
  }

  const running = content.running;
  const supplemental = content.supplemental;
  const mental = content.mental;

  return [
    "RUNNING FOCUS",
    running,
    "",
    "SUPPLEMENTAL TRAINING",
    supplemental,
    "",
    "MENTAL TRAINING",
    mental,
  ].join("\n");
}

// ─── Limitation Notes Builder ───────────────────────────

export function buildRunningLimitationNotes(
  phaseType: RunningPhaseType,
  limitations: RunningLimitation[]
): string | null {
  if (limitations.length === 0) return null;

  const group = phaseToGroup(phaseType);
  const notes: string[] = [];

  for (const lim of limitations) {
    const limNotes = RUNNING_LIMITATION_NOTES[lim];
    const note = limNotes[group];
    if (note) {
      const label =
        lim === "hip-adductor"
          ? "Hip/Adductor"
          : lim === "plantar-fascia"
            ? "Plantar Fascia"
            : lim.charAt(0).toUpperCase() + lim.slice(1);
      notes.push(`${label}: ${note}`);
    }
  }

  return notes.length > 0 ? notes.join(" | ") : null;
}

// ─── Phase Display Names ────────────────────────────────

export function getRunningPhaseDisplayName(phaseType: RunningPhaseType): string {
  const names: Record<RunningPhaseType, string> = {
    "base-building": "Base Building",
    development: "Development",
    "race-prep": "Race Prep & Taper",
    "base-injury-prevention": "Base & Injury Prevention",
    "strength-endurance": "Strength & Endurance",
    "speed-specificity": "Speed & Specificity",
    "taper-race": "Taper & Race",
    rest: "Rest & Recovery",
  };
  return names[phaseType];
}

export function getRunningGoalDistanceDisplayName(distance: RunningGoalDistance): string {
  const names: Record<RunningGoalDistance, string> = {
    "5k": "5K",
    "10k": "10K",
    "half-marathon": "Half Marathon",
    marathon: "Marathon",
    general: "General Fitness",
  };
  return names[distance];
}

// ─── Phase Generation ───────────────────────────────────

export function generateRunningPhases(
  level: RunnerLevel,
  goalDistance: RunningGoalDistance,
  physicalLimitations: RunningLimitation[],
  startDate: string
): GeneratedPhase[] {
  const phases: GeneratedPhase[] = [];
  let currentDate = new Date(startDate + "T00:00:00");

  if (level === "beginner") {
    for (let i = 0; i < BEGINNER_TEMPLATE.length; i++) {
      const t = BEGINNER_TEMPLATE[i];
      const phaseStart = format(currentDate, "yyyy-MM-dd");
      const phaseEnd = format(addWeeks(currentDate, t.weeks), "yyyy-MM-dd");

      phases.push({
        phaseType: t.type,
        orderIndex: i,
        durationWeeks: t.weeks,
        startDate: phaseStart,
        endDate: phaseEnd,
        description: buildRunningPhaseDescription(t.type, goalDistance, level),
        limitationNotes: buildRunningLimitationNotes(t.type, physicalLimitations),
      });

      currentDate = addWeeks(currentDate, t.weeks);
    }
  } else {
    const modifiers =
      level === "advanced"
        ? DISTANCE_MODIFIERS_ADVANCED[goalDistance]
        : DISTANCE_MODIFIERS_INTERMEDIATE[goalDistance];

    for (let i = 0; i < INT_ADV_PHASE_ORDER.length; i++) {
      const phaseType = INT_ADV_PHASE_ORDER[i];
      const weeks = modifiers[i];
      const phaseStart = format(currentDate, "yyyy-MM-dd");
      const phaseEnd = format(addWeeks(currentDate, weeks), "yyyy-MM-dd");

      phases.push({
        phaseType,
        orderIndex: i,
        durationWeeks: weeks,
        startDate: phaseStart,
        endDate: phaseEnd,
        description: buildRunningPhaseDescription(phaseType, goalDistance, level),
        limitationNotes: buildRunningLimitationNotes(phaseType, physicalLimitations),
      });

      currentDate = addWeeks(currentDate, weeks);
    }

    const restStart = format(currentDate, "yyyy-MM-dd");
    const restEnd = format(addWeeks(currentDate, 1), "yyyy-MM-dd");
    phases.push({
      phaseType: "rest",
      orderIndex: INT_ADV_PHASE_ORDER.length,
      durationWeeks: 1,
      startDate: restStart,
      endDate: restEnd,
      description: buildRunningPhaseDescription("rest", goalDistance, level),
      limitationNotes: buildRunningLimitationNotes("rest", physicalLimitations),
    });
  }

  return phases;
}

export function getRunningCycleTotalWeeks(
  level: RunnerLevel,
  goalDistance: RunningGoalDistance
): number {
  if (level === "beginner") {
    return BEGINNER_TEMPLATE.reduce((s, t) => s + t.weeks, 0);
  }
  const modifiers =
    level === "advanced"
      ? DISTANCE_MODIFIERS_ADVANCED[goalDistance]
      : DISTANCE_MODIFIERS_INTERMEDIATE[goalDistance];
  return modifiers.reduce((s, w) => s + w, 0) + 1;
}
