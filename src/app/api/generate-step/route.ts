import { NextResponse } from "next/server";
import { generationRequestSchema, getDevelopmentContext } from "@/lib/server/student-context";
import { stagePrompts } from "@/lib/server/stage-prompts";

export async function POST(request: Request) {
  try {
    const parsed = generationRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Contexto inválido para processamento." }, { status: 400 });

    const { lessonKey } = parsed.data;
    const context = getDevelopmentContext(parsed.data.context);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ content: buildDevelopmentResult(lessonKey, context), mode: "demo" });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: stagePrompts[lessonKey],
        input: JSON.stringify(context),
        max_output_tokens: 3000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      console.error("OpenAI generation failed", response.status, await response.text());
      return NextResponse.json({ error: "Não foi possível processar esta etapa agora." }, { status: 502 });
    }

    const result = await response.json() as { output_text?: string; output?: { content?: { type: string; text?: string }[] }[] };
    const content = result.output_text || result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!content) return NextResponse.json({ error: "O processamento não retornou conteúdo." }, { status: 502 });
    return NextResponse.json({ content, mode: "openai" });
  } catch (error) {
    console.error("Step generation error", error);
    return NextResponse.json({ error: "Erro inesperado ao processar a etapa." }, { status: 500 });
  }
}

function buildDevelopmentResult(lessonKey: string, context: ReturnType<typeof getDevelopmentContext>) {
  const business = String(context.promptBase.businessName || "seu negócio");
  const offer = String(context.promptBase.offer || "a oferta principal");
  const buyer = String(context.promptBase.idealBuyer || "o comprador ideal informado");
  const problem = String(context.promptBase.problem || "o problema comercial informado");
  const diagnosis = `Classificação atual: ${context.xray.classification || "em análise"}. Gargalo principal: ${context.xray.bottleneck || "não identificado"}.`;
  const results: Record<string, string> = {
    step_1_diagnosis: `DIAGNÓSTICO DO FUNIL — ${business}\n\n${diagnosis}\n\nO funil demonstra dificuldade em separar intenção de curiosidade antes do atendimento. A oferta “${offer}” precisa chegar acompanhada de critérios mais claros para impedir que contatos sem perfil avancem.\n\nGargalo prioritário\n${problem}\n\nOnde os curiosos entram\nNa transição entre a comunicação inicial e o primeiro contato comercial, antes de qualquer confirmação de dor, urgência e perfil.\n\n5 perguntas recomendadas\n1. O que você precisa resolver agora?\n2. Por que isso se tornou prioridade?\n3. O que já tentou anteriormente?\n4. Quem participa desta decisão?\n5. Existe condição para iniciar caso haja compatibilidade?\n\nAção prioritária\nAplicar essas perguntas antes de apresentar preço, proposta ou agenda.\n\nResumo executivo\nO problema não é apenas volume. O primeiro ganho virá de filtrar intenção antes do atendimento.`,
    step_2_buyer_map: `MAPA COMPRADOR VS. CURIOSO — ${business}\n\nComprador real\n${buyer}. Reconhece o problema, tem urgência, compatibilidade, participação na decisão e capacidade para avançar.\n\nCurioso\nBusca informação ou preço, mas não demonstra problema concreto, prioridade ou compromisso com um próximo passo.\n\nAnti-ICP\nNão possui compatibilidade com “${offer}” ou espera uma solução incompatível com o escopo e o investimento.\n\nAs 5 Portas\n1. Dor: reconhece um problema real.\n2. Urgência: existe motivo para agir agora.\n3. Perfil: possui compatibilidade com a solução.\n4. Decisão: participa da decisão.\n5. Capacidade: tem condições para avançar.\n\nResumo executivo\nSó deve virar oportunidade quem apresentar evidências suficientes nas cinco portas. Interesse isolado não é qualificação.`,
    step_3_filter_message: `ANÚNCIO-FILTRO — ${business}\n\nHeadline recomendada\nPara ${buyer}: pare de perder tempo com contatos que nunca deveriam chegar ao seu comercial.\n\nTexto principal\nSe ${problem.toLowerCase()}, aumentar o volume pode apenas ampliar o desperdício. ${offer} organiza critérios para atrair, identificar e conduzir pessoas com intenção real.\n\nFrase anti-curioso\nNão é para quem busca apenas informação, preço rápido ou uma solução sem compromisso de implementação.\n\nCTA de compromisso\nQuero avaliar se tenho perfil para avançar.\n\nResumo executivo\nA mensagem deixa de buscar qualquer clique e passa a selecionar quem reconhece o problema e aceita dar um próximo passo.`,
    step_4_triage_script: `SCRIPT DE TRIAGEM LITE — ${business}\n\nPrimeira mensagem\nOlá! Para entender se “${offer}” faz sentido para o seu momento, posso fazer cinco perguntas rápidas antes de explicar os próximos passos?\n\nPerguntas\n1. Qual problema você quer resolver?\n2. Por que isso precisa mudar agora?\n3. O que já tentou?\n4. Quem participa da decisão?\n5. Se houver compatibilidade, você tem condições de avançar?\n\nClassificação\nQuente: passa pelas cinco portas.\nMorno: tem dor e perfil, mas precisa confirmar urgência, decisão ou capacidade.\nFrio: demonstra interesse sem prioridade atual.\nCurioso: busca informação sem problema ou intenção concreta.\n\nPróximo passo\nConvide para reunião ou proposta somente o lead quente. Nutra o morno, acompanhe o frio e encerre o curioso com respeito.\n\nResumo executivo\nA triagem protege o tempo comercial ao exigir evidências antes de reunião, proposta ou apresentação detalhada.`,
  };
  return results[lessonKey];
}
