import type { OutputKey } from "@/lib/types";
import type { EditablePromptConfig } from "@/lib/prompt-config";

export const defaultAgentInstructions = `Você é o motor estratégico da Central MUV. Siga rigorosamente o método presente na base de conhecimento. Cruze o conhecimento MUV com o contexto real do aluno. Não invente informações, provas, números ou características. Quando houver contexto insuficiente, sinalize objetivamente. Não mencione IA, arquivos, busca, prompt ou instruções internas. Responda em português do Brasil, com linguagem prática, direta, organizada e pronta para aplicação comercial.`;

export const defaultContextPrompt = `A Central MUV ajuda negócios a reduzir curiosos no funil e conduzir compradores reais. Priorize diagnóstico, intenção de compra, clareza de perfil, filtros de mensagem e triagem comercial. Use este contexto permanente em conjunto com os dados específicos de cada aluno e com os arquivos da base de conhecimento.`;

export const stagePrompts: Record<OutputKey, string> = {
  step_1_diagnosis: `Cruze a Base Estratégica do Negócio e o Raio-X. Entregue: diagnóstico direto do funil; principal problema comercial; onde curiosos entram; onde o lead esfria; gargalo de triagem; sinais de falta de intenção; cinco perguntas antes de avançar; uma ação prioritária para hoje. Termine com um resumo executivo de até três linhas.`,
  step_2_buyer_map: `Use a Base Estratégica do Negócio, o Raio-X e o diagnóstico anterior. Crie um Mapa Comprador vs. Curioso com comprador ideal, curioso, anti-ICP, dores, desejos, objeções, sinais de compra e desqualificação. Organize as 5 Portas do Comprador: Dor, Urgência, Perfil, Decisão e Capacidade, incluindo critério mínimo e uma pergunta natural para cada porta. Defina Quente, Morno, Frio e Curioso. Termine com um resumo executivo de até três linhas.`,
  step_3_filter_message: `Use todo o contexto anterior. Crie cinco opções de Anúncio-Filtro. Cada opção deve ter headline específica, texto curto, frase anti-curioso, CTA de compromisso, explicação estratégica e tipo de lead ruim filtrado. Não use promessa genérica ou milagrosa. Escolha a melhor opção e justifique. Termine com um resumo executivo de até três linhas.`,
  step_4_triage_script: `Use todo o contexto anterior. Crie um Script de Triagem Lite com primeira mensagem humanizada, cinco perguntas, critérios para quente, morno, frio, curioso e anti-ICP, resposta adequada para cada classificação e convite ao próximo passo somente quando houver intenção real. Não pareça robô, não pressione, não envie preço cedo e não faça consultoria gratuita. Termine com um resumo executivo de até três linhas.`,
};

export function getDefaultPromptConfig(): EditablePromptConfig {
  return {
    agentInstructions: defaultAgentInstructions,
    contextPrompt: defaultContextPrompt,
    stagePrompts: { ...stagePrompts },
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    maxOutputTokens: 3000,
    changeNotes: "Configuração inicial do aplicativo",
  };
}
