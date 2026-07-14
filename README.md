# Central MUV — MUV Starter

Primeira versão funcional da experiência de implementação guiada do MUV Starter. O app prioriza estrutura, UX, formulários e fluxo completo. Clerk, Supabase e Eduzz estão deliberadamente preparados para uma fase posterior.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Em `/entrar`, qualquer opção de acesso inicia a conta demonstrativa local. Os dados ficam em `localStorage` sob a chave `central-muv-v1`; isso é exclusivo desta fase de desenvolvimento.

Comandos de qualidade:

```bash
npm run lint
npm run build
```

## Fluxo implementado

- Página pública e login demonstrativo.
- Shell privado responsivo, menu mobile e retomada da última rota.
- Dashboard e progresso calculado somente por entregáveis concluídos.
- Prompt Base portado do projeto original, com 13 perguntas, condicionais, validações e texto final.
- Raio-X portado do projeto original, com 12 perguntas, score de 0 a 36, cinco classificações e gargalo.
- Quatro aplicações com processamento interno, instruções server-only e entregável gerado automaticamente.
- Kit Final com cópia, TXT, impressão/PDF e status por ativo.
- Imersão, perfil, exclusão dos dados locais e admin demonstrativo em `/admin`.
- PWA instalável via manifest, ícone e metadados.

## Persistência atual

O `AppProvider` em `src/components/app-provider.tsx` implementa um repositório local substituível. Formulários e editores usam debounce antes de atualizar o estado persistido. Para produção, substitua essa implementação por server actions ou rotas protegidas que gravem no Supabase.

## Processamento das etapas

Os prompts não são enviados ao navegador e não aparecem para o aluno. Eles ficam em `src/lib/server/stage-prompts.ts`. A interface chama `POST /api/generate-step`, que valida o contexto com Zod e usa a OpenAI Responses API quando `OPENAI_API_KEY` está configurada. Sem a chave, a rota devolve um resultado demonstrativo para permitir testar o fluxo.

No modo atual, a interface envia o contexto local para essa rota. Na integração de produção, `src/lib/server/student-context.ts` deve ser substituído por uma leitura server-side do perfil autenticado no Supabase. O cliente deverá enviar somente a chave da etapa; Prompt Base, Raio-X e entregáveis anteriores nunca deverão ser aceitos do navegador como fonte confiável.

## Próxima fase: Clerk

1. Crie a aplicação no Clerk e habilite Google, Apple e código por e-mail.
2. Preencha `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` e `CLERK_WEBHOOK_SECRET`.
3. Instale `@clerk/nextjs`, envolva o layout com `ClerkProvider` e troque o login demonstrativo pelo fluxo Clerk.
4. Proteja `/central(.*)` e `/admin(.*)` no middleware.
5. No servidor, associe sempre os dados ao `clerk_user_id` validado. Não confie no e-mail do frontend.

## Próxima fase: Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/migrations/001_initial_schema.sql` no SQL Editor ou pela CLI.
3. Configure as três variáveis Supabase do `.env.example`.
4. Crie um cliente server-only com `SUPABASE_SERVICE_ROLE_KEY`; nunca exporte essa chave ao navegador.
5. Implemente políticas RLS quando o modelo de JWT entre Clerk e Supabase estiver definido.
6. Troque o repositório local por operações server-side validadas com Zod.
7. Na rota de geração, obtenha o `clerk_user_id` da sessão, localize `profiles.id` e carregue `prompt_base_submissions`, `funnel_xray_submissions` e `student_outputs` diretamente no servidor.

## OpenAI

1. Preencha `OPENAI_API_KEY` somente no servidor.
2. Opcionalmente altere `OPENAI_MODEL`; o padrão é `gpt-4.1-mini`.
3. Nunca use uma variável `NEXT_PUBLIC_` para a chave da OpenAI.
4. Após a geração, grave o resultado em `student_outputs` antes de marcar a etapa como concluída.

## Liberar usuário e importar compradores

No modo atual, `/admin` permite alternar o acesso demonstrativo, ler um CSV e exportar o progresso. Com Supabase, a liberação manual deverá criar ou atualizar um `entitlements` com `product_code = 'muv_starter'` e `status = 'active'`. O importador deve aceitar cabeçalhos como `name,email,purchase_email,external_purchase_id`, validar cada linha e fazer upsert no servidor.

## Vercel

1. Publique este diretório em um repositório Git.
2. Importe o repositório na Vercel como Next.js.
3. Cadastre as variáveis do `.env.example` no ambiente correto.
4. Configure o domínio e atualize `NEXT_PUBLIC_APP_URL`.
5. Após Clerk, cadastre o domínio e callbacks na dashboard do provedor.

## Origem dos formulários

O Prompt Base foi portado de `Promt Base - Muv/src/PortableFeatureSection.tsx`. Foram mantidas perguntas, opções, condicionais, limites e regras de preenchimento. Ao final, o aluno vê apenas um resumo; as respostas estruturadas alimentam as etapas seguintes.

O Raio-X foi portado de `Raio-x/src/PortableFeatureSection.tsx`. Foram mantidas as 12 perguntas, opções e pontos, faixas `0–7`, `8–14`, `15–22`, `23–29`, `30–36`, textos centrais e desempate do gargalo na ordem mensagem, qualificação, entrada e comercial.

Os projetos originais não possuíam `package.json`; eram componentes/HTML autocontidos e enviavam resultados diretamente a webhooks públicos do Google Sheets. Esse envio foi removido da Central para evitar expor endpoints e duplicar persistência. Nenhum arquivo original foi alterado.

## Eduzz e HighLevel

Na próxima fase, crie `POST /api/webhooks/eduzz` com verificação de assinatura antes de interpretar o evento. Mantenha um adapter isolado para mapear o payload oficial, pois a estrutura não deve ser inventada. Eventos confirmados devem fazer upsert do entitlement; cancelamento e reembolso devem bloquear o acesso e registrar `activity_events`. HighLevel permanece apenas para comunicação e deve apontar seus botões para `/entrar`.
