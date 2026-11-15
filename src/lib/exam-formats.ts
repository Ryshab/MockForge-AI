/**
 * Data-driven exam formats. Adding a future exam means adding a definition
 * here — the test engine, results and wizard all read from this data.
 *
 * A section owns the timer and locking. Subjects group questions inside a
 * section and never own timers in full-exam mode.
 */

export interface FormatSubject {
  name: string;
  questionCount: number;
}

export interface FormatSection {
  name: string;
  questionCount: number;
  durationMinutes: number;
  subjects: FormatSubject[];
  /** Qualifying sections are reported separately from scored ones. */
  qualifying: boolean;
  /** Free movement between the section's subjects while its shared timer runs. */
  sharedTimer: boolean;
  /** Section locks when its timer expires or it is submitted. */
  locksOnExpiry: boolean;
  notes?: string;
}

export interface ExamFormat {
  id: string;
  name: string;
  tier: string;
  year: number;
  official: boolean;
  sections: FormatSection[];
  marksPerQuestion: number;
  negativeMarks: number;
  enableNegativeMarking: boolean;
  /** Per-section marking overrides, keyed by section name. */
  sectionMarks?: Record<string, { marksPerQuestion: number; negativeMarks: number }>;
  skillTest?: { name: string; simulated: boolean; note: string };
}

function perSubjectSection(name: string, count: number, minutes: number): FormatSection {
  return {
    name,
    questionCount: count,
    durationMinutes: minutes,
    qualifying: false,
    sharedTimer: false,
    locksOnExpiry: true,
    subjects: [{ name, questionCount: count }],
  };
}

function sharedSection(
  name: string,
  subjects: [string, number][],
  minutes: number,
  opts?: { qualifying?: boolean; notes?: string },
): FormatSection {
  return {
    name,
    questionCount: subjects.reduce((sum, [, n]) => sum + n, 0),
    durationMinutes: minutes,
    qualifying: opts?.qualifying ?? false,
    sharedTimer: true,
    locksOnExpiry: true,
    ...(opts?.notes ? { notes: opts.notes } : {}),
    subjects: subjects.map(([subjectName, n]) => ({ name: subjectName, questionCount: n })),
  };
}

/* ------------------------------------------------------------------ */
/* SSC CGL Tier 1 — 2026                                              */
/* ------------------------------------------------------------------ */

export const SSC_CGL_TIER1_2026: ExamFormat = {
  id: "ssc-cgl-tier1-2026",
  name: "SSC CGL Tier 1",
  tier: "Tier 1",
  year: 2026,
  official: true,
  marksPerQuestion: 2,
  negativeMarks: 0.5,
  enableNegativeMarking: true,
  sections: [
    perSubjectSection("General Intelligence and Reasoning", 25, 15),
    perSubjectSection("General Awareness", 25, 15),
    perSubjectSection("Quantitative Aptitude", 25, 15),
    perSubjectSection("English Comprehension", 25, 15),
  ],
};

/* ------------------------------------------------------------------ */
/* SSC CGL Tier 2 — 2026                                              */
/* ------------------------------------------------------------------ */

export const SSC_CGL_TIER2_2026: ExamFormat = {
  id: "ssc-cgl-tier2-2026",
  name: "SSC CGL Tier 2",
  tier: "Tier 2",
  year: 2026,
  official: true,
  marksPerQuestion: 3,
  negativeMarks: 1,
  enableNegativeMarking: true,
  sectionMarks: {
    "Computer Knowledge": { marksPerQuestion: 3, negativeMarks: 1 },
  },
  sections: [
    sharedSection(
      "Section I",
      [
        ["Mathematical Abilities", 30],
        ["Reasoning and General Intelligence", 30],
      ],
      60,
      { notes: "One shared 60-minute timer for both subjects. Free navigation between them." },
    ),
    sharedSection(
      "Section II",
      [
        ["English Language and Comprehension", 45],
        ["General Awareness", 25],
      ],
      60,
      { notes: "One shared 60-minute timer for both subjects. Free navigation between them." },
    ),
    perSubjectSection("Computer Knowledge", 20, 15),
  ],
  skillTest: {
    name: "DEST / Skill Test",
    simulated: false,
    note: "DEST is a separate qualifying skill test conducted offline. It is not simulated here and carries no score.",
  },
};

/* ------------------------------------------------------------------ */
/* SSC CHSL Tier 1 — 2026                                             */
/* ------------------------------------------------------------------ */

export const SSC_CHSL_TIER1_2026: ExamFormat = {
  id: "ssc-chsl-tier1-2026",
  name: "SSC CHSL Tier 1",
  tier: "Tier 1",
  year: 2026,
  official: true,
  marksPerQuestion: 2,
  negativeMarks: 0.5,
  enableNegativeMarking: true,
  sections: [
    perSubjectSection("English Language", 25, 15),
    perSubjectSection("General Intelligence", 25, 15),
    perSubjectSection("Quantitative Aptitude", 25, 15),
    perSubjectSection("General Awareness", 25, 15),
  ],
};

/* ------------------------------------------------------------------ */
/* SSC CHSL Tier 2 — 2026                                             */
/* ------------------------------------------------------------------ */

export const SSC_CHSL_TIER2_2026: ExamFormat = {
  id: "ssc-chsl-tier2-2026",
  name: "SSC CHSL Tier 2",
  tier: "Tier 2",
  year: 2026,
  official: true,
  marksPerQuestion: 3,
  negativeMarks: 1,
  enableNegativeMarking: true,
  sections: [
    sharedSection(
      "Section I",
      [
        ["Mathematical Abilities", 30],
        ["Reasoning and General Intelligence", 30],
      ],
      60,
      { notes: "One shared 60-minute timer for both subjects. Free navigation between them." },
    ),
    sharedSection(
      "Section II",
      [
        ["English Language and Comprehension", 40],
        ["General Awareness", 20],
      ],
      60,
      { notes: "One shared 60-minute timer for each section's subjects. Free navigation between them." },
    ),
    perSubjectSection("Computer Knowledge", 15, 15),
  ],
  skillTest: {
    name: "Typing / Skill Test",
    simulated: false,
    note: "The typing/skill test is a separate qualifying component conducted offline. It is not simulated here and carries no score.",
  },
};

/** Official presets ship with the app; custom ones live in the format store. */
export const OFFICIAL_FORMATS: readonly ExamFormat[] = [
  SSC_CGL_TIER1_2026,
  SSC_CGL_TIER2_2026,
  SSC_CHSL_TIER1_2026,
  SSC_CHSL_TIER2_2026,
];

export function formatTotalQuestions(format: ExamFormat): number {
  return format.sections.reduce((sum, s) => sum + s.questionCount, 0);
}

export function formatTotalMinutes(format: ExamFormat): number {
  return format.sections.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function formatLabel(format: ExamFormat): string {
  return `${format.name} — ${format.year}`;
}

/** Marks config for a section, honouring per-section overrides. */
export function sectionMarking(
  format: ExamFormat,
  sectionName: string,
): { marksPerQuestion: number; negativeMarks: number } {
  return (
    format.sectionMarks?.[sectionName] ?? {
      marksPerQuestion: format.marksPerQuestion,
      negativeMarks: format.negativeMarks,
    }
  );
}

/** Standalone durations for single-subject practice, independent of full-exam timers. */
export interface StandaloneSubject {
  sectionName: string;
  subject: FormatSubject;
  questions: number;
  minutes: number;
}

export function standaloneSubjects(format: ExamFormat): StandaloneSubject[] {
  return format.sections.flatMap((section) =>
    section.subjects.map((subject) => ({
      sectionName: section.name,
      subject,
      questions: subject.questionCount,
      minutes: Math.round((subject.questionCount / section.questionCount) * section.durationMinutes),
    })),
  );
}

export function formatById(id: string, custom: readonly ExamFormat[]): ExamFormat | null {
  return OFFICIAL_FORMATS.find((f) => f.id === id) ?? custom.find((f) => f.id === id) ?? null;
}
