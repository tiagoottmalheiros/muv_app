# Central MUV — MUV Starter

Primeira versão funcional da experiência de implementação guiada do MUV Starter. O app prioriza estrutura, UX, formulários e fluxo completo. Clerk, Supabase e Eduzz estão deliberadamente preparados para uma fase posterior.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Use `/entrar`, `/sign-in` ou `/sign-up` para acessar com uma conta Clerk. O progresso é persistido no Supabase e mantém um fallback local isolado por `userId`.

Comandos de qualidade:

```bash
npm run lint
npm run build
```

## Fluxo implementado

- Página pública e autenticação Clerk com entrada, cadastro e menu do usuário.
- Shell privado responsivo, menu mobile e retomada da última rota.
- Dashboard e progresso calculado somente por entregáveis concluídos.
- Prompt Base portado do projeto original, com 13 perguntas, condicionais, validações e texto final.
- Raio-X portado do projeto original, com 12 perguntas, score de 0 a 36, cinco classificações e gargalo.
- Quatro aplicações com processamento interno, instruções server-only e entregável gerado automaticamente.
- Kit Final com cópia, TXT, impressão/PDF e status por ativo.
- Imersão, perfil, exclusão dos dados locais e administração em `/admin`.
- Prompt Studio em `/admin/prompts`, com rascunho, comparação, publicação e histórico de versões.
- PWA instalável via manifest, ícone e metadados.

## Persistência atual

O `AppProvider` mantém estado reativo e usa `localStorage` somente como fallback. O estado principal é carregado e salvo com debounce por `/api/student/state`, que grava Prompt Base, Raio-X, progresso, entregáveis e Imersão no Supabase.

## Processamento das etapas

Os prompts não são enviados ao navegador do aluno. A versão publicada fica em `prompt_configs`; `src/lib/server/stage-prompts.ts` mantém o fallback inicial caso o Supabase esteja indisponível. A interface chama `POST /api/generate-step`, que carrega o contexto salvo no Supabase e usa a OpenAI Responses API com `file_search`. Sem a chave, a rota devolve um resultado demonstrativo.

Em `/admin/prompts`, administradores podem editar um rascunho, comparar sua resposta com a versão publicada e consultar o histórico. O estado versionado é inicializado automaticamente em `activity_events`, sem migration adicional. A identidade e a lista de administradores são validadas pelo Clerk no servidor.

Cada operação server-side usa o `userId` validado pelo Clerk para localizar ou criar o perfil correspondente. O Prompt Base, o Raio-X e os entregáveis anteriores são lidos do Supabase antes da geração.

## Clerk

O projeto está vinculado à aplicação Clerk `MUV - App`. O `ClerkProvider` fica dentro do `body`, e `src/proxy.ts` mantém apenas a landing page e as rotas de autenticação públicas. As APIs e áreas `/central` e `/admin` exigem sessão válida.

Em desenvolvimento, qualquer usuário autenticado pode abrir o admin. Em produção, configure `ADMIN_CLERK_USER_IDS` com os IDs Clerk autorizados, separados por vírgula. Também configure uma instância Clerk de produção antes do deploy.

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
3. Execute `npm run knowledge:upload` para criar o Vector Store e enviar os arquivos de `knowledge/`.
4. O script grava `OPENAI_VECTOR_STORE_ID` no `.env.local`.
5. Nunca use uma variável `NEXT_PUBLIC_` para chaves da OpenAI.
6. As gerações são auditadas em `ai_generations`; o entregável aprovado é salvo em `student_outputs`.

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
