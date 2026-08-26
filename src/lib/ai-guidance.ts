export type DaliliAiSuggestion = {
  title: string;
  description: string;
  action: string;
  href: string;
};

export type SuggestedIndicator = {
  label: string;
  plainQuestion: string;
  description: string;
  suggestedFormula: string;
  targetHint: string;
};

const sectorIndicatorBank: Record<string, SuggestedIndicator[]> = {
  health: [
    {
      label: "People reached with services",
      plainQuestion: "How many people received the service?",
      description: "Use this to show direct service reach by age, sex, facility or location.",
      suggestedFormula: "Count records where service received is not blank or equals Yes.",
      targetHint: "Compare against the project service-delivery target.",
    },
    {
      label: "Referral completion",
      plainQuestion: "Of those referred, how many completed the referral?",
      description: "Use this to track whether clients actually reached the next service point.",
      suggestedFormula: "Completed referrals divided by all referred clients.",
      targetHint: "A useful early target is 70–85%, depending on context.",
    },
    {
      label: "Client satisfaction",
      plainQuestion: "Were clients satisfied with the service?",
      description: "Use this to monitor service quality and client experience.",
      suggestedFormula: "Satisfied clients divided by clients with a satisfaction response.",
      targetHint: "Many programmes use 80%+ as a practical benchmark.",
    },
  ],
  education: [
    {
      label: "Learners enrolled",
      plainQuestion: "How many learners joined the programme?",
      description: "Use this as the main reach measure for training or education projects.",
      suggestedFormula: "Count records where learner/enrolment status is present.",
      targetHint: "Compare with the planned enrolment target.",
    },
    {
      label: "Completion rate",
      plainQuestion: "How many learners completed the activity or course?",
      description: "Use this to show whether participants stayed through the programme.",
      suggestedFormula: "Completed learners divided by enrolled learners.",
      targetHint: "A common target is 75–90%, depending on project intensity.",
    },
    {
      label: "Outcome achievement",
      plainQuestion: "How many learners achieved the intended outcome?",
      description: "Use this for test pass, certification, employment or skill-gain outcomes.",
      suggestedFormula: "Learners achieving outcome divided by learners assessed.",
      targetHint: "Set this from the donor/client results framework if one exists.",
    },
  ],
  agriculture: [
    {
      label: "Farmers reached",
      plainQuestion: "How many farmers participated?",
      description: "Use this to show reach across groups, locations and farmer types.",
      suggestedFormula: "Count farmer records with a participation or registration status.",
      targetHint: "Compare against the planned farmer reach target.",
    },
    {
      label: "Practice adoption",
      plainQuestion: "How many farmers adopted the promoted practice?",
      description: "Use this to show whether training translated into behaviour change.",
      suggestedFormula: "Farmers adopting practice divided by farmers reached or trained.",
      targetHint: "A realistic early target may be 40–70%, depending on cost and seasonality.",
    },
    {
      label: "Income or yield improvement",
      plainQuestion: "Are farmers reporting improved income or production?",
      description: "Use this for outcome reporting where the project aims to improve livelihoods.",
      suggestedFormula: "Farmers reporting improvement divided by farmers with follow-up data.",
      targetHint: "Use a cautious target if baseline/follow-up data quality is weak.",
    },
  ],
  wash: [
    {
      label: "Households reached",
      plainQuestion: "How many households or people were reached?",
      description: "Use this to report basic programme coverage.",
      suggestedFormula: "Count households/people with a completed activity or service record.",
      targetHint: "Compare against the programme target population.",
    },
    {
      label: "Access improvement",
      plainQuestion: "How many households gained access to improved WASH services?",
      description: "Use this to show whether the intervention changed service access.",
      suggestedFormula: "Households with improved access divided by households assessed.",
      targetHint: "Set target based on service area and infrastructure plan.",
    },
    {
      label: "Behaviour adoption",
      plainQuestion: "Are households using the promoted hygiene practice?",
      description: "Use this to track behaviour change, not only infrastructure delivery.",
      suggestedFormula: "Households practicing behaviour divided by households observed/surveyed.",
      targetHint: "Use disaggregation by location or household type.",
    },
  ],
  general: [
    {
      label: "People reached",
      plainQuestion: "How many people did we reach?",
      description: "Use this as the basic reach measure for almost any project.",
      suggestedFormula: "Count valid participant, client or beneficiary records.",
      targetHint: "Compare against the planned reach target.",
    },
    {
      label: "Activity completion",
      plainQuestion: "How many planned activities were completed?",
      description: "Use this to monitor implementation progress against the workplan.",
      suggestedFormula: "Completed activities divided by planned or recorded activities.",
      targetHint: "Useful monthly or quarterly target: 80–100% of planned activities.",
    },
    {
      label: "Target achievement",
      plainQuestion: "Are we on track against the project target?",
      description: "Use this to quickly tell managers or clients if progress is enough.",
      suggestedFormula: "Actual result divided by target.",
      targetHint: "Set the target from the contract, proposal, logframe or workplan.",
    },
    {
      label: "Equity check",
      plainQuestion: "Who is being reached or left out?",
      description: "Use this to compare results by sex, age group, location or other groups.",
      suggestedFormula: "Disaggregate a reach, completion or outcome indicator by group.",
      targetHint: "Use this even when there is no formal numeric target.",
    },
  ],
};

function normaliseSector(sector?: string) {
  const value = (sector ?? "").toLowerCase();
  if (value.includes("health") || value.includes("hiv") || value.includes("srh") || value.includes("clinic")) return "health";
  if (value.includes("education") || value.includes("school") || value.includes("training") || value.includes("skills")) return "education";
  if (value.includes("agric") || value.includes("farmer") || value.includes("food")) return "agriculture";
  if (value.includes("wash") || value.includes("water") || value.includes("sanitation")) return "wash";
  return "general";
}

export function getSuggestedIndicatorsForSector(sector?: string) {
  const key = normaliseSector(sector);
  const core = sectorIndicatorBank[key] ?? sectorIndicatorBank.general;
  const general = sectorIndicatorBank.general.filter((item) => !core.some((existing) => existing.label === item.label));
  return [...core, ...general].slice(0, 6);
}

export function getAiWorkflowSuggestions(args: {
  hasProject: boolean;
  hasDataset: boolean;
  hasQuality: boolean;
  hasIndicator: boolean;
  hasInsights: boolean;
  hasReport: boolean;
  sector?: string;
}): DaliliAiSuggestion[] {
  if (!args.hasProject) {
    return [
      {
        title: "Start by describing the project",
        description: "Dalili needs the project goal, location, target group and reporting period before it can suggest what to track.",
        action: "Create project",
        href: "/projects?new=1",
      },
    ];
  }

  if (!args.hasDataset) {
    return [
      {
        title: "Set up what to track before you analyse",
        description: "Because this product is for teams without M&E staff, Dalili can suggest starter indicators and an evidence checklist before any data is uploaded.",
        action: "Open project guide",
        href: "/workspace",
      },
      {
        title: "Upload programme data or evidence",
        description: "Upload an attendance sheet, activity tracker, Kobo export, beneficiary list or report so Dalili can check quality and prepare findings.",
        action: "Upload evidence",
        href: "/data-room",
      },
    ];
  }

  if (!args.hasQuality) {
    return [
      {
        title: "Check whether the data is usable",
        description: "Before reporting results, Dalili should check missing values, duplicates, sensitive fields and inconsistent locations.",
        action: "Run quality check",
        href: "/quality-check",
      },
    ];
  }

  if (!args.hasIndicator) {
    return [
      {
        title: "Choose the question you want answered",
        description: "Dalili can help turn a plain question such as ‘How many people did we reach?’ into a measurable result.",
        action: "Track results",
        href: "/indicators",
      },
    ];
  }

  if (!args.hasInsights) {
    return [
      {
        title: "Review the finding before using it",
        description: "Dalili can explain what the indicator means, but a person should approve it before it goes into a report.",
        action: "Review findings",
        href: "/insights",
      },
    ];
  }

  if (!args.hasReport) {
    return [
      {
        title: "Turn the evidence into an output",
        description: "The goal is a donor/client-ready brief, report, DQA summary or presentation that explains progress and gaps.",
        action: "Create report",
        href: "/reports",
      },
    ];
  }

  return [
    {
      title: "Your evidence journey is ready to share",
      description: "Export the final output and keep the quality check, indicator and review trail for accountability.",
      action: "Open reports",
      href: "/reports",
    },
  ];
}

export function explainIndicatorResult(args: { name: string; numerator: number; denominator: number; percentage: number; target?: number | null; missingNote?: string }) {
  const targetText = typeof args.target === "number" ? ` The target is ${args.target}%, so the current gap is ${Math.round((args.percentage - args.target) * 10) / 10} percentage points.` : " No target has been set yet, so this should be interpreted as a baseline result.";
  const caution = args.denominator === 0 ? " This result cannot be interpreted because the denominator is zero." : args.denominator < 30 ? " Treat this cautiously because it is based on a small number of records." : "";
  return `${args.name}: ${args.numerator} out of ${args.denominator} records meet the selected rule, giving ${args.percentage}%.${targetText}${caution}${args.missingNote ? ` ${args.missingNote}` : ""}`;
}
