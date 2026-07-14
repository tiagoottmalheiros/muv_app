import { z } from "zod";
import type { PromptBaseAnswers } from "./types";

export type PromptQuestion =
  | { id: string; title: string; subtitle: string; type: "select"; key: keyof PromptBaseAnswers; options: { value: string; label: string }[]; otherKey?: keyof PromptBaseAnswers }
  | { id: string; title: string; subtitle: string; type: "textarea"; key: keyof PromptBaseAnswers; placeholder: string; maxLength: number }
  | { id: string; title: string; subtitle: string; type: "optional"; key: keyof PromptBaseAnswers; noneKey: keyof PromptBaseAnswers; placeholder: string; noneLabel: string; textarea?: boolean; maxLength?: number }
  | { id: string; title: string; subtitle: string; type: "transform"; fromKey: keyof PromptBaseAnswers; toKey: keyof PromptBaseAnswers };

export const promptQuestions: PromptQuestion[] = [
  { id: "objective", title: "Qual seu principal objetivo nos próximos 3 meses?", subtitle: "Escolha o objetivo mais importante agora.", type: "select", key: "objective", options: [["vendas", "Aumentar vendas / faturamento"], ["leads_melhores", "Atrair leads melhores"], ["reduzir_curiosos", "Reduzir curiosos no WhatsApp"], ["melhorar_conversao", "Melhorar conversão em reuniões ou vendas"], ["organizar_atendimento", "Organizar atendimento comercial"], ["aumentar_ticket", "Vender ofertas de maior valor"]].map(([value, label]) => ({ value, label })) },
  { id: "segment", title: "Qual seu segmento?", subtitle: "Escolha a área principal do seu negócio.", type: "select", key: "segment", otherKey: "segmentOther", options: [["saude", "Saúde"], ["marketing", "Marketing / Digital"], ["educacao", "Educação"], ["consultoria", "Consultoria"], ["tecnologia", "Tecnologia"], ["servicos", "Prestação de Serviços"], ["varejo", "Varejo"], ["imobiliario", "Imobiliário"], ["financeiro", "Financeiro"], ["industria", "Indústria / B2B técnico"], ["outro", "Outro"]].map(([value, label]) => ({ value, label })) },
  { id: "website", title: "Seu negócio tem site?", subtitle: "Se tiver, cole o link para enriquecer o contexto do seu negócio.", type: "optional", key: "websiteUrl", noneKey: "noWebsite", noneLabel: "Não tenho site", placeholder: "https://www.seunegocio.com.br" },
  { id: "social", title: "Seu negócio tem redes sociais?", subtitle: "Cole os links principais, como Instagram, LinkedIn, YouTube ou TikTok.", type: "optional", key: "socialLinks", noneKey: "noSocialLinks", noneLabel: "Não tenho redes sociais", placeholder: "Links das redes sociais", textarea: true, maxLength: 400 },
  { id: "offer", title: "O que você vende?", subtitle: "Descreva sua principal oferta em uma frase.", type: "textarea", key: "offer", placeholder: "Ex: Consultoria para clínicas aumentarem agendamentos qualificados.", maxLength: 300 },
  { id: "ticket", title: "Qual é o ticket médio dessa oferta?", subtitle: "Pode ser um valor aproximado.", type: "select", key: "ticket", options: [["ate_500", "Até R$500"], ["500_2000", "R$500 a R$2.000"], ["2000_5000", "R$2.000 a R$5.000"], ["5000_10000", "R$5.000 a R$10.000"], ["10000_50000", "R$10.000 a R$50.000"], ["acima_50000", "Acima de R$50.000"]].map(([value, label]) => ({ value, label })) },
  { id: "salesModel", title: "Como a venda acontece hoje?", subtitle: "Escolha o principal caminho até a venda.", type: "select", key: "salesModel", options: [["whatsapp", "WhatsApp"], ["reuniao", "Reunião / call"], ["diagnostico", "Diagnóstico consultivo"], ["ligacao", "Ligação"], ["proposta", "Proposta comercial"], ["checkout", "Checkout direto"], ["presencial", "Atendimento presencial"]].map(([value, label]) => ({ value, label })) },
  { id: "idealBuyer", title: "Quem é seu melhor cliente?", subtitle: "Descreva quem tem mais chance de comprar e ter resultado.", type: "textarea", key: "idealBuyer", placeholder: "Ex: Donos de clínicas que já recebem leads.", maxLength: 400 },
  { id: "problem", title: "Qual problema principal sua oferta resolve?", subtitle: "Fale da dor real do cliente antes de comprar.", type: "textarea", key: "problem", placeholder: "Descreva o problema central.", maxLength: 400 },
  { id: "transformation", title: "Qual transformação você entrega?", subtitle: "Complete a mudança principal.", type: "transform", fromKey: "transformationFrom", toKey: "transformationTo" },
  { id: "differentiator", title: "Qual é seu principal diferencial?", subtitle: "Explique por que alguém deveria escolher você.", type: "textarea", key: "differentiator", placeholder: "Método, experiência, suporte ou implementação.", maxLength: 300 },
  { id: "objections", title: "O que normalmente trava a compra?", subtitle: "Liste as dúvidas ou objeções mais comuns.", type: "textarea", key: "objections", placeholder: "Está caro, preciso pensar, não tenho tempo...", maxLength: 400 },
  { id: "tone", title: "Qual tom de voz sua marca deve usar?", subtitle: "Como a comunicação deve soar?", type: "select", key: "tone", options: [["formal", "Profissional / Formal"], ["consultivo", "Consultivo / Estratégico"], ["direto", "Direto / Objetivo"], ["didatico", "Didático / Simples"], ["premium", "Premium / Sofisticado"], ["proximo", "Próximo / Humano"]].map(([value, label]) => ({ value, label })) },
];

const labels = Object.fromEntries(promptQuestions.flatMap((q) => q.type === "select" ? q.options.map((o) => [o.value, o.label]) : []));

export function getPromptLabel(value: string) {
  return labels[value] || value;
}
export const promptBaseSchema = z.object({ businessName: z.string().trim().min(2).max(120) }).passthrough();

export function isPromptQuestionAnswered(q: PromptQuestion, data: PromptBaseAnswers) {
  if (q.type === "select") return Boolean(String(data[q.key]).trim()) && (!q.otherKey || data[q.key] !== "outro" || Boolean(String(data[q.otherKey]).trim()));
  if (q.type === "textarea") return Boolean(String(data[q.key]).trim());
  if (q.type === "optional") return Boolean(String(data[q.key]).trim()) || data[q.noneKey] === true;
  return Boolean(String(data[q.fromKey]).trim() && String(data[q.toKey]).trim());
}

export function generatePromptBase(d: PromptBaseAnswers) {
  const segment = d.segment === "outro" ? d.segmentOther : labels[d.segment];
  return `RESUMO DO NEGÓCIO\n\n${d.businessName} atua no segmento de ${segment} e vende ${d.offer}\n\nO comprador prioritário é ${d.idealBuyer}\n\nA oferta resolve ${d.problem}\n\nA transformação esperada é sair de “${d.transformationFrom}” e chegar em “${d.transformationTo}”.\n\nObjetivo atual: ${labels[d.objective]}. Ticket: ${labels[d.ticket]}. Venda por: ${labels[d.salesModel]}.\n\nBase estratégica registrada. Essas respostas serão usadas automaticamente nas próximas etapas.`;
}
