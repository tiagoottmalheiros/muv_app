import { EMPTY_APP_DATA, EMPTY_PROMPT_BASE, type AppData } from "./types";

export function createDemoData(): AppData {
  const name = "Aluno MUV";
  const email = "aluno@muv.com.br";

  return {
    ...EMPTY_APP_DATA,
    authenticated: true,
    user: { name, email, purchaseEmail: email },
    promptBase: {
      answers: { ...EMPTY_PROMPT_BASE, name, email },
      generatedText: "",
      completed: false,
      currentStep: 0,
    },
    lastRoute: "/central/comece-aqui",
    lastActivityAt: new Date().toISOString(),
  };
}
