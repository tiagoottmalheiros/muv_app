import type { OutputKey } from "./types";

const pandaEmbedBaseUrl = "https://player-vz-ae487791-05f.tv.pandavideo.com.br/embed/?v=";

export const pandaVideoUrls: Record<"comece-aqui" | "prompt-base" | "raio-x" | "kit-final" | OutputKey, string> = {
  "comece-aqui": `${pandaEmbedBaseUrl}37412938-bdc9-4243-aef4-708eca299279`,
  "prompt-base": `${pandaEmbedBaseUrl}32f39fcb-553f-4499-9dab-278f58f26ee2`,
  "raio-x": `${pandaEmbedBaseUrl}7f4151d3-cc5c-448b-93ba-ca993bce8e03`,
  step_1_diagnosis: `${pandaEmbedBaseUrl}b393cb07-965e-4de1-905e-84cd7e7ad534`,
  step_2_buyer_map: `${pandaEmbedBaseUrl}0b63beff-6da4-4a36-b9ea-19561a95c026`,
  step_3_filter_message: `${pandaEmbedBaseUrl}13e4b7c2-1f70-49d2-947d-adb39eb23416`,
  step_4_triage_script: `${pandaEmbedBaseUrl}d0b5d2c7-5791-402f-8695-e1fc34f157ac`,
  "kit-final": `${pandaEmbedBaseUrl}cbd98524-c2cb-4416-8911-83d145c60971`,
};
