export function normalizeLegacyProductTerms(text: string) {
  return text
    .replace(/PROMPT LITE \d+\s*[—-]\s*/gi, "")
    .replace(/Atue como o Don MUV,\s*/gi, "Atue como ")
    .replace(/Don MUV\s*[—-]\s*CEO/gi, "Central MUV")
    .replace(/Don MUV/gi, "Central MUV")
    .replace(/Prompt Base do Negócio/gi, "Base Estratégica")
    .replace(/Prompt Base/gi, "Base Estratégica")
    .replace(/\bPasso 1\b(?!\d)/gi, "Plano de Correção do Gargalo");
}
