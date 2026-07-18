import { NextResponse } from "next/server";
import { generationRequestSchema, getDevelopmentContext } from "@/lib/server/student-context";
import { assertAuthenticatedStudentAccess, loadDevelopmentStudentState, recordDevelopmentGeneration, StudentAccessError } from "@/lib/server/student-repository";
import { generateWithMuvAgent } from "@/lib/openai/agent";

export async function POST(request: Request) {
  try {
    await assertAuthenticatedStudentAccess();
    const parsed = generationRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Contexto inválido para processamento." }, { status: 400 });

    const { lessonKey } = parsed.data;
    const storedState = process.env.SUPABASE_SERVICE_ROLE_KEY ? await loadDevelopmentStudentState() : null;
    if (!storedState && !parsed.data.context) return NextResponse.json({ error: "Contexto do aluno não encontrado." }, { status: 409 });
    const context = storedState
      ? {
          promptBase: storedState.promptBase.answers,
          xray: {
            score: storedState.xray.score,
            classification: storedState.xray.classification,
            leakLevel: storedState.xray.leakLevel,
            bottleneck: storedState.xray.bottleneck,
            answers: storedState.xray.answers,
          },
          previousOutputs: Object.fromEntries(Object.entries(storedState.outputs).map(([key, output]) => [key, output?.content ?? ""])),
        }
      : getDevelopmentContext(parsed.data.context!);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ content: buildDevelopmentResult(lessonKey, context), mode: "demo" });

    const result = await generateWithMuvAgent(lessonKey, context);
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await recordDevelopmentGeneration({
        outputKey: lessonKey,
        model: result.model,
        responseId: result.responseId,
        status: "completed",
        usedKnowledgeBase: result.usedKnowledgeBase,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
      });
    }
    return NextResponse.json({ content: result.content, mode: "openai", usedKnowledgeBase: result.usedKnowledgeBase });
  } catch (error) {
    console.error("Step generation error", error);
    if (error instanceof StudentAccessError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Erro inesperado ao processar a etapa." }, { status: 500 });
  }
}

function buildDevelopmentResult(lessonKey: string, context: ReturnType<typeof getDevelopmentContext>) {
  const business = String(context.promptBase.businessName || "seu negócio");
  const offer = String(context.promptBase.offer || "a oferta principal");
  const buyer = String(context.promptBase.idealBuyer || "o comprador ideal informado");
  const problem = String(context.promptBase.problem || "o problema comercial informado");
  const bottleneck = String(context.xray.bottleneck || "filtro e triagem");
  const results: Record<string, string> = {
    step_1_diagnosis: `PRIORIDADE COMERCIAL\nImpedir que contatos sem dor, urgência e perfil avancem antes da avaliação comercial.\n\nCAUSA PROVÁVEL DO GARGALO\nO ponto de ${bottleneck} ainda depende de critérios informais para separar interesse de intenção real.\n\nPONTO DO FUNIL QUE PRECISA MUDAR\nA passagem entre a comunicação inicial e o primeiro atendimento da oferta “${offer}”.\n\nIMPACTO SOBRE TEMPO, CONVERSÃO E CAIXA\nO time tende a gastar tempo explicando a oferta para contatos sem perfil, reduzindo foco nas oportunidades e tornando conversão e caixa menos previsíveis.\n\nAÇÃO PARA OS PRÓXIMOS 7 DIAS\nAplicar critérios de dor, urgência e perfil antes de agenda, proposta ou atendimento e registrar o resultado de cada triagem.\n\nINDICADOR PARA ACOMPANHAR\nPercentual de contatos que atendem aos critérios mínimos antes de avançar.\n\nO QUE NÃO PRIORIZAR AGORA\nNão aumentar volume ou tráfego antes de corrigir o filtro relacionado a “${problem}”.`,
    step_2_buyer_map: `MAPA COMPRADOR VS. CURIOSO — ${business}\n\nComprador real\n${buyer}. Reconhece o problema, tem urgência, compatibilidade, participação na decisão e capacidade para avançar.\n\nCurioso\nBusca informação ou preço, mas não demonstra problema concreto, prioridade ou compromisso com um próximo passo.\n\nAnti-ICP\nNão possui compatibilidade com “${offer}” ou espera uma solução incompatível com o escopo e o investimento.\n\nAs 5 Portas\n1. Dor: reconhece um problema real.\n2. Urgência: existe motivo para agir agora.\n3. Perfil: possui compatibilidade com a solução.\n4. Decisão: participa da decisão.\n5. Capacidade: tem condições para avançar.\n\nResumo executivo\nSó deve virar oportunidade quem apresentar evidências suficientes nas cinco portas. Interesse isolado não é qualificação.`,
    step_3_filter_message: `ANÚNCIO-FILTRO — ${business}\n\nHeadline recomendada\nPara ${buyer}: pare de perder tempo com contatos que nunca deveriam chegar ao seu comercial.\n\nTexto principal\nSe ${problem.toLowerCase()}, aumentar o volume pode apenas ampliar o desperdício. ${offer} organiza critérios para atrair, identificar e conduzir pessoas com intenção real.\n\nFrase anti-curioso\nNão é para quem busca apenas informação, preço rápido ou uma solução sem compromisso de implementação.\n\nCTA de compromisso\nQuero avaliar se tenho perfil para avançar.\n\nResumo executivo\nA mensagem deixa de buscar qualquer clique e passa a selecionar quem reconhece o problema e aceita dar um próximo passo.`,
    step_4_triage_script: `SCRIPT DE TRIAGEM LITE — ${business}\n\nPrimeira mensagem\nOlá! Para entender se “${offer}” faz sentido para o seu momento, posso fazer cinco perguntas rápidas antes de explicar os próximos passos?\n\nPerguntas\n1. Qual problema você quer resolver?\n2. Por que isso precisa mudar agora?\n3. O que já tentou?\n4. Quem participa da decisão?\n5. Se houver compatibilidade, você tem condições de avançar?\n\nClassificação\nQuente: passa pelas cinco portas.\nMorno: tem dor e perfil, mas precisa confirmar urgência, decisão ou capacidade.\nFrio: demonstra interesse sem prioridade atual.\nCurioso: busca informação sem problema ou intenção concreta.\n\nPróximo passo\nConvide para reunião ou proposta somente o lead quente. Nutra o morno, acompanhe o frio e encerre o curioso com respeito.\n\nResumo executivo\nA triagem protege o tempo comercial ao exigir evidências antes de reunião, proposta ou apresentação detalhada.`,
  };
  return results[lessonKey];
}
