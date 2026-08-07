function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const option = (id, label, details = {}) => ({ id, label, ...details });
const control = (id, answerPath, prompt, type, options, details = {}) => ({
  id,
  answerPath,
  prompt,
  type,
  options,
  ...details,
});

const PRIMARY_USE_OPTIONS = [
  option("study-productivity", "University, studying and general productivity"),
  option("software-development", "Programming and software development"),
  option("cybersecurity-vms", "Cybersecurity labs and virtual machines"),
  option("photo-editing", "Photography and image editing"),
  option("video-editing", "Video editing and motion work"),
  option("music-production", "Music and audio production"),
  option("3d-engineering", "3D, CAD, engineering or simulation work"),
];

const ACTIVITY_OPTIONS = [
  option("documents-browsing-calls", "Documents, notes, email and video calls", {
    group: "Study and productivity",
    relevantUses: ["study-productivity"],
  }),
  option("research-spreadsheets-tabs", "Research, large spreadsheets and many browser tabs", {
    group: "Study and productivity",
    relevantUses: ["study-productivity"],
  }),
  option("statistics-analysis-local-tools", "Statistics, data analysis or specialist apps", {
    group: "Study and productivity",
    relevantUses: ["study-productivity"],
  }),
  option("general-programming", "General programming and scripts", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("web-mobile-development", "Web or mobile development", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("local-development-servers", "Local development servers", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("local-databases", "Local databases", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("docker-containers", "Docker or containers", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("one-virtual-machine", "One virtual machine", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("two-virtual-machines", "Two simultaneous virtual machines", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("three-plus-virtual-machines", "Three or more simultaneous virtual machines", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("larger-local-ai-models", "Larger local AI models", {
    group: "Programming and cybersecurity",
    relevantUses: ["software-development", "cybersecurity-vms"],
  }),
  option("jpeg-light-edits", "JPEG files and light edits", {
    group: "Photography",
    relevantUses: ["photo-editing"],
  }),
  option("regular-raw-editing", "Regular RAW editing", {
    group: "Photography",
    relevantUses: ["photo-editing"],
  }),
  option("large-raw-batches-panoramas", "Large RAW batches or panoramas", {
    group: "Photography",
    relevantUses: ["photo-editing"],
  }),
  option("professional-sustained-photo", "Sustained professional photo work", {
    group: "Photography",
    relevantUses: ["photo-editing"],
  }),
  option("1080p-light", "Light 1080p projects", {
    group: "Video",
    relevantUses: ["video-editing"],
  }),
  option("4k-single-stream", "Single-stream 4K projects", {
    group: "Video",
    relevantUses: ["video-editing"],
  }),
  option("4k-multicam-effects", "4K multicam projects, motion graphics or frequent effects", {
    group: "Video",
    relevantUses: ["video-editing"],
  }),
  option("6k-8k-sustained", "Sustained 6K or 8K projects", {
    group: "Video",
    relevantUses: ["video-editing"],
  }),
  option("small-projects-few-plugins", "Small projects with a few plugins", {
    group: "Music and audio",
    relevantUses: ["music-production"],
  }),
  option("medium-music-projects", "Medium music projects", {
    group: "Music and audio",
    relevantUses: ["music-production"],
  }),
  option("large-sample-libraries-many-plugins", "Large sample libraries or many plugins", {
    group: "Music and audio",
    relevantUses: ["music-production"],
  }),
  option("professional-low-latency", "Professional low-latency sessions", {
    group: "Music and audio",
    relevantUses: ["music-production"],
  }),
  option("2d-light-models", "2D work or light models", {
    group: "3D and engineering",
    relevantUses: ["3d-engineering"],
  }),
  option("moderate-3d-models", "Moderate 3D models", {
    group: "3D and engineering",
    relevantUses: ["3d-engineering"],
  }),
  option("complex-cad-simulation", "Complex CAD, 3D modelling or simulation", {
    group: "3D and engineering",
    relevantUses: ["3d-engineering"],
  }),
  option("sustained-rendering-simulation", "Sustained rendering or simulation", {
    group: "3D and engineering",
    relevantUses: ["3d-engineering"],
  }),
  option("unsure", "I’m not sure yet", { exclusive: true }),
];

export const QUESTION_DEFINITIONS = deepFreeze([
  {
    id: "budget",
    prompt: "Set your budget",
    controls: [
      control(
        "budgetTarget",
        "budget.target",
        "What’s your budget?",
        "radio",
        [
          option("up-to-1000", "Up to £1,000"),
          option("up-to-1500", "Up to £1,500"),
          option("up-to-2000", "Up to £2,000"),
          option("up-to-2500", "Up to £2,500"),
          option("up-to-3000", "Up to £3,000"),
          option("up-to-4500", "Up to £4,500"),
          option("no-fixed-target", "I’m not sure yet"),
        ],
        { required: true, help: "Choose the most you’d ideally like to spend." },
      ),
      control(
        "budgetMode",
        "budget.mode",
        "Could you spend more for a better match?",
        "radio",
        [
          option("strict", "No — do not go over my budget"),
          option("flexible", "Maybe — stay within it where possible"),
          option("stretch", "Yes — consider a stronger match above it"),
        ],
        {
          required: true,
          help: "If you choose Maybe or Yes, you can still set an absolute maximum.",
          visibility: { path: "budget.target", operator: "not-in", values: ["", "no-fixed-target"] },
        },
      ),
      control(
        "absoluteBudget",
        "budget.absoluteMaximum",
        "What’s the most you could spend?",
        "radio",
        [
          option("up-to-1500", "Up to £1,500"),
          option("up-to-2000", "Up to £2,000"),
          option("up-to-2500", "Up to £2,500"),
          option("up-to-3000", "Up to £3,000"),
          option("up-to-4500", "Up to £4,500"),
          option("no-absolute-limit", "No absolute maximum"),
        ],
        {
          required: false,
          help: "Optional. Nothing above this amount will be recommended.",
          visibility: { path: "budget.mode", operator: "in", values: ["flexible", "stretch"] },
        },
      ),
    ],
  },
  {
    id: "primaryUses",
    prompt: "Choose your main uses",
    controls: [
      control(
        "primaryUses",
        "primaryUses",
        "What will you mainly use your MacBook for?",
        "checkbox",
        PRIMARY_USE_OPTIONS,
        { required: true, minimumSelections: 1, maximumSelections: 2, help: "Choose up to two." },
      ),
    ],
  },
  {
    id: "activities",
    prompt: "Tell us what you’ll do",
    controls: [
      control(
        "activities",
        "activities",
        "What will you do on your MacBook?",
        "checkbox",
        ACTIVITY_OPTIONS,
        {
          required: true,
          minimumSelections: 1,
          help: "Select all that apply. Choose ‘I’m not sure yet’ on its own if needed.",
        },
      ),
    ],
  },
  {
    id: "multitasking",
    prompt: "Tell us about multitasking",
    controls: [
      control(
        "multitasking",
        "multitasking",
        "How heavily do you multitask?",
        "radio",
        [
          option("light", "Light — a few everyday apps and browser tabs"),
          option("moderate", "Moderate — several apps and lots of tabs"),
          option("heavy", "Heavy — demanding apps, development tools or one virtual machine"),
          option("very-heavy", "Very heavy — multiple demanding apps or virtual machines at once"),
          option("varies-unsure", "It varies or I’m not sure"),
        ],
        { required: true, help: "Choose the option closest to your normal busiest setup." },
      ),
    ],
  },
  {
    id: "devicePreferences",
    prompt: "Choose your device preferences",
    controls: [
      control(
        "portabilityPerformance",
        "devicePreferences.portabilityPerformance",
        "What matters more to you: portability or performance?",
        "radio",
        [
          option("portability-first", "Portability — I carry it every day"),
          option("lean-portability", "Mostly portability — I carry it most days"),
          option("balanced", "A balance of both"),
          option("lean-performance", "Mostly performance — I carry it occasionally"),
          option("performance-first", "Performance — it will usually stay on a desk"),
          option("let-northstar-decide", "Let Northstar decide"),
        ],
        {
          required: true,
          help: "This is a preference unless you later choose a strict weight limit.",
        },
      ),
      control(
        "screenSize",
        "devicePreferences.screenSize",
        "What screen size do you prefer?",
        "radio",
        [
          option("13-inch", "13-inch"),
          option("14-inch", "14-inch"),
          option("15-inch", "15-inch"),
          option("16-inch", "16-inch"),
          option("no-preference", "No preference"),
        ],
        { required: true },
      ),
    ],
  },
  {
    id: "minimumStorage",
    prompt: "Choose your storage",
    controls: [
      control(
        "minimumStorage",
        "minimumStorage",
        "How much storage do you need?",
        "radio",
        [
          option("256gb", "256 GB"),
          option("512gb", "512 GB"),
          option("1tb", "1 TB"),
          option("2tb-plus", "2 TB or more"),
          option("unsure", "I’m not sure"),
        ],
        {
          required: true,
          help: "Choose the least you know you need. ‘I’m not sure’ keeps every storage size in consideration.",
        },
      ),
    ],
  },
  {
    id: "essentialRequirements",
    prompt: "Choose your must-haves",
    controls: [
      control(
        "essentialRequirements",
        "essentialRequirements",
        "Which of these are absolute must-haves?",
        "checkbox",
        [
          option("workload", "Comfortably handle all the activities I selected"),
          option("exact-screen", "Have my preferred screen size", {
            visibility: {
              path: "devicePreferences.screenSize",
              operator: "not-in",
              values: ["", "no-preference"],
            },
          }),
          option("maximum-weight", "Stay within a strict weight limit"),
          option(
            "external-displays",
            "Support the number of external monitors I need",
          ),
          option("none", "None — find the best overall balance", { exclusive: true }),
        ],
        {
          required: true,
          minimumSelections: 1,
          help: "Select only needs you would not compromise on. ‘None’ must be selected on its own.",
        },
      ),
    ],
  },
  {
    id: "maximumWeight",
    prompt: "Set your weight limit",
    visibility: { path: "essentialRequirements", operator: "includes", value: "maximum-weight" },
    controls: [
      control(
        "maximumWeight",
        "essentialDetails.maximumWeight",
        "What’s your strict weight limit?",
        "radio",
        [
          option("up-to-1.25kg", "1.25 kg"),
          option("up-to-1.55kg", "1.55 kg"),
          option("up-to-1.75kg", "1.75 kg"),
          option("up-to-2.05kg", "2.05 kg"),
        ],
        { required: true },
      ),
    ],
  },
  {
    id: "externalDisplayCount",
    prompt: "Set your monitor requirement",
    visibility: { path: "essentialRequirements", operator: "includes", value: "external-displays" },
    controls: [
      control(
        "externalDisplayCount",
        "essentialDetails.externalDisplayCount",
        "How many external monitors do you need to use at once?",
        "radio",
        [
          option("one", "One"),
          option("two", "Two"),
          option("three", "Three"),
          option("four-plus", "Four or more"),
        ],
        {
          required: true,
          help: "This means external monitors used at the same time as the MacBook’s built-in screen.",
        },
      ),
    ],
  },
]);

export const QUESTION_ORDER = deepFreeze(QUESTION_DEFINITIONS.map(({ id }) => id));

export const QUESTION_DEPENDENCIES = deepFreeze({
  budgetTarget: ["budgetMode", "absoluteBudget"],
  budgetMode: ["absoluteBudget"],
  primaryUses: ["activities"],
  screenSize: ["essentialRequirements"],
  essentialRequirements: ["maximumWeight", "externalDisplayCount"],
});

const QUESTIONS_BY_ID = new Map(QUESTION_DEFINITIONS.map((definition) => [definition.id, definition]));
const CONTROLS_BY_ID = new Map();
const STEPS_BY_CONTROL_ID = new Map();
QUESTION_DEFINITIONS.forEach((definition) => {
  definition.controls.forEach((questionControl) => {
    CONTROLS_BY_ID.set(questionControl.id, questionControl);
    STEPS_BY_CONTROL_ID.set(questionControl.id, definition);
  });
});

export function getQuestionDefinition(questionId) {
  return QUESTIONS_BY_ID.get(questionId) ?? null;
}

export function getQuestionControl(controlId) {
  return CONTROLS_BY_ID.get(controlId) ?? null;
}

export function getQuestionStepForControl(controlId) {
  return STEPS_BY_CONTROL_ID.get(controlId) ?? null;
}

export function getAllQuestionControls() {
  return [...CONTROLS_BY_ID.values()];
}
