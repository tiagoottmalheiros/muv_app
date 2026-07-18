import type { OutputKey } from "./types";

export type Lesson = {
  key: OutputKey; eyebrow: string; title: string; objective: string; central: string; concepts: { title: string; text: string }[];
  deliverable: string; nextHref: string; nextLabel: string;
};

export const lessons: Record<OutputKey, Lesson> = {
  step_1_diagnosis: {
    key: "step_1_diagnosis", eyebrow: "Aplicação 1 de 4", title: "Plano de Correção do Gargalo", objective: "Transformar sua base e seu Raio-X em um diagnóstico claro e um plano de ação para o principal gargalo.", central: "Mais lead não resolve lead ruim.", deliverable: "Plano de Correção do Gargalo", nextHref: "/central/passo-2-comprador-real", nextLabel: "Avançar para Comprador Real",
    concepts: [{ title: "Volume não corrige filtro", text: "Mais contatos amplificam um processo sem critério." }, { title: "Encontre o vazamento", text: "Descubra onde o curioso entra, avança ou perde intenção." }, { title: "Corrija primeiro", text: "Escolha uma ação simples para o gargalo principal." }],
  },
  step_2_buyer_map: {
    key: "step_2_buyer_map", eyebrow: "Passo 2 de 4", title: "Comprador Real: Quem Deve Avançar e Quem Deve Ser Filtrado?", objective: "Definir critérios reais para transformar contato em oportunidade.", central: "Interesse não é oportunidade.", deliverable: "Mapa Comprador vs. Curioso", nextHref: "/central/passo-3-mensagem-filtro", nextLabel: "Avançar para Anúncio-Filtro",
    concepts: [{ title: "Dor", text: "Existe um problema real e reconhecido?" }, { title: "Urgência", text: "Há motivo concreto para resolver agora?" }, { title: "Perfil e decisão", text: "Existe compatibilidade e poder de decisão?" }, { title: "Capacidade", text: "Há condições reais para avançar?" }],
  },
  step_3_filter_message: {
    key: "step_3_filter_message", eyebrow: "Passo 3 de 4", title: "Anúncio-Filtro: Como Atrair Compradores e Repelir Curiosos", objective: "Criar uma mensagem que gere intenção, não apenas clique.", central: "O anúncio não serve para atrair todo mundo. Serve para filtrar.", deliverable: "Primeira versão do Anúncio-Filtro + CTA de Compromisso", nextHref: "/central/passo-4-triagem", nextLabel: "Avançar para Triagem Lite",
    concepts: [{ title: "Especificidade", text: "A pessoa certa precisa se reconhecer rapidamente." }, { title: "Frase anti-curioso", text: "Deixe claro quem não deve avançar." }, { title: "CTA de compromisso", text: "Peça uma decisão pequena, não apenas um clique." }],
  },
  step_4_triage_script: {
    key: "step_4_triage_script", eyebrow: "Passo 4 de 4", title: "Triagem Lite: Como Parar de Tratar Curioso Como Oportunidade", objective: "Criar uma triagem humana antes de reunião, proposta ou atendimento comercial.", central: "Pergunte antes de explicar.", deliverable: "Script de Triagem Lite", nextHref: "/central/kit-final", nextLabel: "Assistir à aula final",
    concepts: [{ title: "Dor real", text: "O lead reconhece um problema concreto?" }, { title: "Próximo passo", text: "Só avance quando houver intenção suficiente." }, { title: "Resposta adequada", text: "Quente, morno, frio e curioso exigem conduções diferentes." }],
  },
};
