import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

loadLocalEnv();
if (!process.env.OPENAI_API_KEY) throw new Error("Configure OPENAI_API_KEY em .env.local antes de executar este script.");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const knowledgeDirectory = path.resolve("knowledge");
const files = fs.readdirSync(knowledgeDirectory).filter((file) => file.endsWith(".md")).sort();
if (!files.length) throw new Error("Nenhum arquivo Markdown encontrado em knowledge/.");

const vectorStore = await openai.vectorStores.create({ name: "Base de Conhecimento MUV" });
for (const filename of files) {
  process.stdout.write(`Enviando ${filename}... `);
  await openai.vectorStores.files.uploadAndPoll(vectorStore.id, fs.createReadStream(path.join(knowledgeDirectory, filename)));
  console.log("concluído");
}

setLocalEnv("OPENAI_VECTOR_STORE_ID", vectorStore.id);
console.log(`\nVector Store criado: ${vectorStore.id}`);
console.log("OPENAI_VECTOR_STORE_ID foi atualizado no .env.local. Adicione o mesmo valor às variáveis da Vercel.");

function loadLocalEnv() {
  const filename = path.resolve(".env.local");
  if (!fs.existsSync(filename)) return;
  for (const line of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function setLocalEnv(key, value) {
  const filename = path.resolve(".env.local");
  const lines = fs.existsSync(filename) ? fs.readFileSync(filename, "utf8").split(/\r?\n/) : [];
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  fs.writeFileSync(filename, `${lines.filter((line, lineIndex) => line || lineIndex < lines.length - 1).join("\n")}\n`, "utf8");
}
