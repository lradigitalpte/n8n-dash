export type AiTestCase = {
  id: string;
  category: string;
  question: string;
  expectedAnswer: string;
  /** All must appear in KB chunks the bot would retrieve (case-insensitive). */
  mustInclude: string[];
  /** If any appear in retrieved chunks, flag as fail (wrong/stale data). */
  mustNotInclude?: string[];
};

export type OrgAiTestScript = {
  orgName: string;
  tests: AiTestCase[];
};

/** Per-org customer question scripts. Add a new orgId key for each tenant. */
export const AI_TEST_SCRIPTS: Record<string, OrgAiTestScript> = {
  org_zumbaton: {
    orgName: "One Step Fitness",
    tests: [
      {
        id: "classes-list",
        category: "Classes",
        question: "What classes do you have?",
        expectedAnswer:
          "Groove Stepper, Zumba Step, Piloxing, Thunderbolt (Bodyweight & Steppers + Resistance & Dance), Lil Steppers, One Familia, ZumFiesta.",
        mustInclude: ["Groove Stepper", "Zumba Step", "Thunderbolt"],
        mustNotInclude: ["hello@zumbaton.sg", "Zumbuddies"],
      },
      {
        id: "thunderbolt",
        category: "Classes",
        question: "Tell me about Thunderbolt",
        expectedAnswer:
          "Two Thunderbolt formats: Bodyweight & Steppers (Coach Robert) and Resistance & Dance (Coach Fizah). Level 5, high intensity.",
        mustInclude: ["Thunderbolt"],
      },
      {
        id: "adult-single",
        category: "Pricing",
        question: "How much is a single adult class?",
        expectedAnswer: "$30.00 SGD for a single adult session.",
        mustInclude: ["$30", "30.00"],
      },
      {
        id: "kids-4pack",
        category: "Pricing",
        question: "Kids class price — my child is 8",
        expectedAnswer: "$20 single or $75 for kids 4-pack. Ages 5–12, guardian required.",
        mustInclude: ["$20", "75"],
      },
      {
        id: "one-familia",
        category: "Pricing",
        question: "How much is One Familia for 1 child and 1 adult?",
        expectedAnswer: "$38.00 SGD one-time for 1 Child + 1 Adult.",
        mustInclude: ["$38", "38.00"],
      },
      {
        id: "promo-overview",
        category: "Promotions",
        question: "Tell me about the promotion you are running",
        expectedAnswer:
          "1-for-1 duo trials: Studio $23 per duo, Outdoor $35 per duo at onestepfitness.sg/promos.",
        mustInclude: ["$23", "$35", "duo"],
      },
      {
        id: "promo-how-much",
        category: "Promotions",
        question: "How much is the 1-for-1 studio duo trial?",
        expectedAnswer: "$23 SGD per duo for studio (Zumba Step, Groove Stepper, or Thunderbolt).",
        mustInclude: ["$23", "23"],
        mustNotInclude: ["$40", "$50"],
      },
      {
        id: "location",
        category: "General",
        question: "Where are you located and what are your hours?",
        expectedAnswer:
          "2 Jalan Klapa, #2-A, Singapore 199314. Mon–Sun 9AM–9PM. hello@onestepfitness.sg",
        mustInclude: ["Jalan Klapa", "9"],
        mustNotInclude: ["hello@zumbaton.sg"],
      },
      {
        id: "zumfiesta",
        category: "Classes",
        question: "What is ZumFiesta and how much?",
        expectedAnswer: "Outdoor class at OCBC Arena Kallang. $28 for 1 session.",
        mustInclude: ["$28", "ZumFiesta"],
      },
      {
        id: "coaches",
        category: "General",
        question: "Who are your coaches?",
        expectedAnswer: "Coach Lavs, Coach Robert, Coach Fizah (names from KB / instructors page).",
        mustInclude: ["Coach"],
      },
    ],
  },
  org_demo: {
    orgName: "Demo Studio",
    tests: [
      {
        id: "demo-placeholder",
        category: "General",
        question: "What classes do you offer?",
        expectedAnswer: "Add knowledge chunks for org_demo, then add test cases here.",
        mustInclude: [],
      },
    ],
  },
};

export function getScriptForOrg(orgId: string): OrgAiTestScript | null {
  return AI_TEST_SCRIPTS[orgId] ?? null;
}

export function evaluateKbRetrieval(
  chunks: { title: string; content: string }[],
  test: AiTestCase,
): { status: "pass" | "fail" | "warn"; missing: string[]; forbidden: string[] } {
  const blob = chunks.map((c) => `${c.title} ${c.content}`).join(" ").toLowerCase();
  const missing = test.mustInclude.filter((kw) => !blob.includes(kw.toLowerCase()));
  const forbidden = (test.mustNotInclude ?? []).filter((kw) => blob.includes(kw.toLowerCase()));

  if (chunks.length === 0) {
    return { status: "fail", missing: test.mustInclude, forbidden };
  }
  if (forbidden.length > 0) {
    return { status: "fail", missing, forbidden };
  }
  if (missing.length > 0) {
    return { status: "warn", missing, forbidden };
  }
  return { status: "pass", missing, forbidden };
}
