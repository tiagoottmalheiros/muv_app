export type StepStatus = "not_started" | "in_progress" | "completed";

export type PromptBaseAnswers = {
  name: string;
  email: string;
  businessName: string;
  objective: string;
  segment: string;
  segmentOther: string;
  websiteUrl: string;
  noWebsite: boolean;
  socialLinks: string;
  noSocialLinks: boolean;
  offer: string;
  ticket: string;
  salesModel: string;
  idealBuyer: string;
  problem: string;
  transformationFrom: string;
  transformationTo: string;
  differentiator: string;
  objections: string;
  tone: string;
};

export type XrayCategory = "entrada" | "mensagem" | "qualificacao" | "comercial";
export type XrayAnswer = { questionId: number; category: XrayCategory; answer: string; score: number; optionIndex: number };

export type XraySubmission = {
  answers: XrayAnswer[];
  score: number;
  classification: string;
  leakLevel: string;
  bottleneck: XrayCategory;
  generatedText: string;
  completed: boolean;
};

export type OutputKey = "step_1_diagnosis" | "step_2_buyer_map" | "step_3_filter_message" | "step_4_triage_script";

export type StudentOutput = {
  key: OutputKey;
  title: string;
  content: string;
  completed: boolean;
  updatedAt: string;
};

export type AppData = {
  authenticated: boolean;
  entitlement: "active" | "pending" | "blocked";
  user: { name: string; email: string; purchaseEmail: string; avatarUrl?: string };
  promptBase: { answers: PromptBaseAnswers; generatedText: string; completed: boolean; currentStep: number; updatedAt?: string };
  xray: XraySubmission & { currentStep: number; updatedAt?: string };
  outputs: Partial<Record<OutputKey, StudentOutput>>;
  startedSteps: string[];
  comeceAquiCompleted: boolean;
  kitReviewed: boolean;
  immersion: { viewed: boolean; clicked: boolean; confirmed: boolean; confirmedAt?: string };
  lastRoute: string;
  lastActivityAt: string;
};

export const EMPTY_PROMPT_BASE: PromptBaseAnswers = {
  name: "", email: "", businessName: "", objective: "", segment: "", segmentOther: "", websiteUrl: "", noWebsite: false,
  socialLinks: "", noSocialLinks: false, offer: "", ticket: "", salesModel: "", idealBuyer: "", problem: "", transformationFrom: "",
  transformationTo: "", differentiator: "", objections: "", tone: "",
};

export const EMPTY_APP_DATA: AppData = {
  authenticated: false,
  entitlement: "active",
  user: { name: "Aluno MUV", email: "aluno@muv.com.br", purchaseEmail: "aluno@muv.com.br" },
  promptBase: { answers: EMPTY_PROMPT_BASE, generatedText: "", completed: false, currentStep: 0 },
  xray: { answers: [], score: 0, classification: "", leakLevel: "", bottleneck: "mensagem", generatedText: "", completed: false, currentStep: 0 },
  outputs: {}, startedSteps: [], comeceAquiCompleted: false, kitReviewed: false,
  immersion: { viewed: false, clicked: false, confirmed: false }, lastRoute: "/central/comece-aqui", lastActivityAt: new Date(0).toISOString(),
};
