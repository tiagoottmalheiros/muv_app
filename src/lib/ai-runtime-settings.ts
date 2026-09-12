import { z } from "zod";

export const aiRuntimeSettingsSchema = z.object({
  dailyGenerationLimit: z.number().int().min(1).max(20),
  cooldownSeconds: z.number().int().min(0).max(3600),
  minimumOutputCharacters: z.number().int().min(200).max(10000),
  minimumMarkdownSections: z.number().int().min(1).max(20),
  requireKnowledgeBase: z.boolean(),
});

export type AiRuntimeSettings = z.infer<typeof aiRuntimeSettingsSchema>;

export const defaultAiRuntimeSettings: AiRuntimeSettings = {
  dailyGenerationLimit: 4,
  cooldownSeconds: 30,
  minimumOutputCharacters: 600,
  minimumMarkdownSections: 3,
  requireKnowledgeBase: false,
};

export class GenerationQualityError extends Error {}

export function validateGeneratedContent(content: string, settings: AiRuntimeSettings) {
  const text = content.trim();
  if (text.length < settings.minimumOutputCharacters)
    throw new GenerationQualityError(`A resposta não atingiu o mínimo de ${settings.minimumOutputCharacters} caracteres configurado.`);

  const sections = (text.match(/^##\s+\S/gm) ?? []).length;
  if (sections < settings.minimumMarkdownSections)
    throw new GenerationQualityError(`A resposta não atingiu o mínimo de ${settings.minimumMarkdownSections} seções configurado.`);
}
