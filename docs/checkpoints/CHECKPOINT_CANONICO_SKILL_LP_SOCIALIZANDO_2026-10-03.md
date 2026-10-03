# CHECKPOINT CANÔNICO — SKILL LP SOCIALIZANDO

**Data:** 03/10/2026  
**Projeto:** Socializando — Landing Page / Oficinas / Administração / Pagamentos  
**Status:** CANÔNICO — usar como ponto de continuidade em qualquer novo chat.  
**Objetivo:** preservar integralmente a lógica, arquitetura, regras visuais, estado técnico, decisões já validadas e padrão de execução da SKILL DE LP. Não reconstruir do zero, não simplificar e não descaracterizar sem autorização expressa.

---

## 1. PRINCÍPIO DE CONTINUIDADE

Este checkpoint substitui checkpoints anteriores quando houver divergência de estado.

A SKILL DE LP deve continuar a partir deste estado. É proibido:

- reiniciar a LP do zero;
- trocar repositório, domínio, Supabase ou arquitetura sem autorização;
- simplificar fluxos já validados;
- reintroduzir bugs ou decisões já superadas;
- alterar elementos não solicitados em um pedido pontual;
- afirmar que algo está publicado sem conferir produção;
- expor segredos, senhas, service-role, certificados ou credenciais bancárias;
- usar outro banco/gateway para o Pix sem autorização expressa;
- transformar comandos claros em longas rodadas de confirmação desnecessárias.

### Regra de interpretação de comandos

Quando o usuário der um comando específico e suficientemente claro:

1. compreender literalmente o objeto da alteração;
2. preservar todo o restante;
3. executar diretamente;
4. testar o ponto alterado e possíveis regressões relevantes;
5. validar CI/deploy/DB quando aplicável;
6. informar com precisão o que foi feito e o que ainda estiver pendente.

Não adicionar requisitos, textos, classificações ou mudanças de design não solicitadas.

---

## 2. ESTADO OFICIAL DE PRODUÇÃO

- Repositório oficial: `AdvGabrielDeble/socializando.github.io`
- Branch de produção: `main`
- Domínio oficial: `https://www.projetosocializando.com.br`
- CNAME: `www.projetosocializando.com.br`
- Commit canônico atual: `f35babbbeb71540ca7cef428fe9b41f67f931162`
- Mensagem do commit: `LP — Atualiza arte da Expedição Jurássica`
- GitHub Actions no commit canônico:
  - `Oficinas tests`: **success**
  - `pages build and deployment`: **success**

Nunca considerar uma alteração publicada antes de o deploy do GitHub Pages registrar `success`.

---

## 3. IDENTIDADE OPERACIONAL DA LP

Menu oficial:

`Projeto · Habilidades · Temporada · Oficinas · Galeria · Dúvidas`

O menu mobile está corrigido e deve continuar revelando todas as opções, fechando após seleção e por `Esc`, sem alterar o desktop.

A seção `#oficinas` está integrada à LP e deve permanecer entre Temporada e Galeria, salvo solicitação expressa em sentido diverso.

Não alterar o design global da LP sem pedido explícito.

---

## 4. OFICINAS ATUAIS — ESTADO REAL DO BANCO EM 03/10/2026

### 4.1 Expedição Jurássica

- ID: `288dd859-0d94-4fc9-a3f5-f6bd709efc46`
- experience_key: `expedicao-jurassica`
- slug: `expedicao-jurassica-2026-10-10`
- título: `Expedição Jurássica`
- descrição curta: `Monte, explore e crie seu dinossauro!`
- data: `10/10/2026`
- horário: `14:00–15:30`
- idade mínima: `5`
- preço: `R$ 45,00` / `4500` centavos
- capacidade atual: **16 vagas**
- status: `open`
- payment_mode atual: `manual_pix`
- reservation_minutes: `15`
- image_url atual: `/assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp`

### 4.2 Fábrica dos Squishy Mágicos

- ID: `88058033-8884-4e0f-86c1-91d69dcab1e7`
- experience_key: `fabrica-dos-squishy-magicos`
- slug: `fabrica-dos-squishy-magicos-2026-10-10`
- título: `Fábrica dos Squishy Mágicos`
- descrição curta: `Oficina de Paper Squishy especial do Dia das Crianças.`
- data: `10/10/2026`
- horário: `15:30–17:00`
- idade mínima: `5`
- preço: `R$ 45,00` / `4500` centavos
- capacidade atual: **15 vagas**
- status: `open`
- payment_mode atual: `manual_pix`
- reservation_minutes: `15`
- image_url atual: `/assets/oficinas/fabrica-squishy-magicos-2026-10-10.png`

### 4.3 Regra de linguagem das oficinas

Diretriz validada em 03/10/2026:

- NÃO usar `para meninos`;
- NÃO usar `para meninas`;
- NÃO substituir por frases genéricas como `para crianças` sem necessidade;
- apenas apresentar as oficinas, seus nomes, proposta, data, horário, valor e demais dados necessários.

Busca no repositório em 03/10/2026 confirmou ausência de `para meninos` e `para meninas`.

---

## 5. ARTES CANÔNICAS

### 5.1 Expedição Jurássica — nova arte oficial aprovada em 03/10/2026

Fonte aprovada enviada pelo usuário:

- `DINO.png`
- source SHA-256: `6940fca9541736a3f67f9f59fe3971ab63b679b48c77b802bb00adc13384b615`
- source bytes: `5419125`

Ativo web publicado:

- path: `assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp`
- SHA-256: `c0dacfae9358056a43bd2d3ee339c7734b8cafa755f3622c1edb9a418608bcf4`
- bytes: `673534`
- dimensões: `1365 × 2048`
- MIME: `image/webp`
- status: `approved-2026-10-03-published-web-asset`

Regra atual: a arte-fonte aprovada não pode ser redesenhada, recortada, recolorida ou reinterpretada. Quando houver necessidade técnica de otimização web, a cópia publicada deve preservar integralmente composição e dimensões, ser documentada e validada por SHA-256.

O admin possui regra canônica correspondente para esta arte. Não voltar ao hash/arquivo antigo.

### 5.2 Fábrica dos Squishy Mágicos

- path: `assets/oficinas/fabrica-squishy-magicos-2026-10-10.png`
- SHA-256: `2ed21c9bd59f01659f5812d3d9a7a6574bdbb95cdf6b972dca558e9f61ecd339`
- bytes: `3529499`
- dimensões: `1254 × 1254`
- status: `source-verified-binary-in-repository`

Permanece inalterada.

### 5.3 Regra para novas turmas

Nova turma em outra data não herda automaticamente arte que contenha data/horário impressos. Arte nova deve ser aprovada especificamente e vinculada àquela turma.

---

## 6. PREÇO E DADOS OPERACIONAIS

Preço oficial atual das oficinas: **R$ 45,00**.

Representação técnica: `4500` centavos.

A consistência deve ser preservada em:

- LP;
- Supabase;
- checkout;
- mensagens;
- admin;
- testes;
- seeds/configurações aplicáveis.

Configuração Pix manual atual:

- tipo de chave: `CNPJ`
- chave: `59.380.867/0001-62`
- merchantName: `SOCIALIZANDO`
- merchantCity: `BAGE`

WhatsApp oficial:

- `+55 53 99951-9569`
- normalizado: `5553999519569`

---

## 7. SUPABASE

Projeto oficial:

- nome: Socializando
- project id: `yjvaorgnebzbpsqetfpu`
- região: `sa-east-1`
- URL: `https://yjvaorgnebzbpsqetfpu.supabase.co`
- plano: Free

Regra permanente: não contratar serviço pago nem mudar plano sem autorização expressa.

Principais tabelas:

- `workshops`
- `registrations`
- `admin_users`
- `admin_emails`
- `admin_audit_log`
- `admin_credentials`
- `payment_transactions`

### Snapshot de inscrições em 03/10/2026

Este bloco é apenas fotografia do momento, não regra permanente:

- `pending_payment`: 1
- `payment_reported`: 1
- `confirmed`: 6
- `cancelled`: 3
- `expired`: 0

Não usar esses números como invariantes em futuras execuções; consultar o banco novamente.

---

## 8. ADMIN V4.8.2 — LOGIN ESTÁVEL

Painel:

`/oficinas/admin.html`

Usuário administrativo:

`SOCIALIZANDO`

A senha NÃO deve ser escrita em checkpoints, GitHub, HTML, JS ou respostas desnecessárias.

Arquitetura consolidada:

`Usuário + senha → Edge Function admin-login → validação backend por bcrypt → geração de sessão Supabase Auth → RLS`

Edge Function atual:

- `admin-login`
- status: `ACTIVE`
- versão: `3`

O login via Magic Link está abandonado e não deve ser reintroduzido.

A credencial administrativa própria fica em `admin_credentials`, protegida; a senha não fica em plaintext.

Cache atual do admin:

- `admin.css?v=483`
- `supabase-config.js?v=483`
- `admin.js?v=483`

---

## 9. FLUXO PIX MANUAL ATUAL — AINDA EM PRODUÇÃO

Apesar da fundação V5 já existir, as oficinas atuais continuam em `payment_mode = manual_pix`.

Fluxo atual preservado até ativação expressa da API Sicredi:

1. cadastro;
2. `pending_payment`;
3. usuário realiza Pix;
4. usuário informa que fez o Pix;
5. status `payment_reported` passa a ocupar vaga;
6. WhatsApp é preparado;
7. equipe verifica;
8. `confirmed` não consome vaga novamente;
9. cancelamento devolve a vaga.

Disponibilidade manual atual:

`capacity - (payment_reported + confirmed)`

Não remover esse fallback antes de a V5 Sicredi estar realmente habilitada e testada.

---

## 10. V5.0 FINANCEIRA — SICREDI PIX

### Estado

Fundação técnica já implementada, versionada e publicada no backend, porém **NÃO ativada nas oficinas públicas**.

Commit-base da fundação:

`0d9fe01a3b1e1debe7c36f112e53e110f8abcc49`

### Desenho canônico

`Cadastro → reserva temporária → cobrança Pix Sicredi com txid único → QR/Copia e Cola → pagamento → webhook Sicredi → reconciliação na API Sicredi → confirmação da inscrição → vaga definitivamente ocupada → handoff de WhatsApp`

### Regras

- usar a conta Sicredi já existente;
- NÃO sugerir trocar de banco;
- NÃO usar gateway/intermediário pago sem autorização;
- reserva padrão: 15 minutos;
- reserva válida ocupa disponibilidade temporariamente;
- confirmação do Pix transforma reserva em confirmada sem baixar vaga duas vezes;
- valor divergente ou pagamento fora do prazo vai para `review`;
- webhook não é aceito cegamente: o backend reconcilia com a API do Sicredi antes de confirmar;
- mutações financeiras ficam restritas ao backend/service_role;
- status público usa identificador + public_token, sem expor dados pessoais.

### Edge Functions V5 atuais

- `pix-checkout` — ACTIVE — versão 3
- `pix-webhook` — ACTIVE — versão 3
- `pix-status` — ACTIVE — versão 1

### Estado de segurança

Sem credenciais Sicredi, `pix-checkout` responde controladamente `PIX_AUTOMATICO_NAO_CONFIGURADO` e nenhuma oficina atual está em `sicredi_api`.

### Credenciais esperadas do Sicredi

Nunca versionar ou exibir em código público:

- `SICREDI_PIX_ENV`
- `SICREDI_PIX_CLIENT_ID`
- `SICREDI_PIX_CLIENT_SECRET`
- `SICREDI_PIX_CERT_PEM`
- `SICREDI_PIX_KEY_PEM`
- `SICREDI_PIX_RECEIVER_KEY`
- `SICREDI_PIX_WEBHOOK_TOKEN`

Pendência externa atual: obter/liberar as credenciais API Pix da conta Sicredi existente.

---

## 11. LÓGICA DE VAGAS V5

Quando uma oficina for ativada em `sicredi_api`:

`Disponíveis = capacidade - reservas válidas - payment_reported legados - confirmados`

A reserva expirada deixa de ocupar vaga.

A confirmação Pix deve ser idempotente:

- reserva: 15 → 14;
- confirmação: continua 14;
- jamais 13 por segunda baixa.

Teste transacional já realizado e aprovado com rollback, validando esse comportamento.

---

## 12. WHATSAPP

Fluxo atual usa o WhatsApp oficial e prepara a mensagem após o marco operacional aplicável.

Na V5 definitiva:

- confirmação financeira deve ser independente do WhatsApp;
- falha de WhatsApp nunca deve reverter pagamento nem vaga;
- pagamento confirmado deve produzir status `VAGA CONFIRMADA`;
- automação integral de envio de WhatsApp é camada separada e não deve comprometer estabilidade do checkout.

---

## 13. PAINEL ADMINISTRATIVO

Capacidades já existentes e que não podem ser perdidas:

- dashboard;
- total de turmas;
- vagas disponíveis;
- vagas ocupadas;
- Pix aguardando conferência;
- criar nova oficina;
- abrir nova turma;
- editar título, descrição, data, horários, idade mínima, valor, capacidade e status;
- controles rápidos de vagas;
- impedir capacidade menor que ocupação;
- upload/vinculação de arte;
- validação canônica de artes aprovadas;
- filtros de inscrições;
- WhatsApp clicável;
- confirmar/cancelar inscrição;
- auditoria administrativa;
- login por usuário/senha com sessão segura.

Nova oficina e nova turma continuam conceitos distintos.

---

## 14. TESTES E DISCIPLINA DE PUBLICAÇÃO

Regras permanentes:

1. alterações críticas devem ter teste ou verificação objetiva;
2. bug relevante: preferir reproduzir/testar antes da correção;
3. não alterar produção sem preservar fallback quando houver dependência externa;
4. migrations/schema devem ser idempotentes quando possível;
5. usar branch própria para mudanças relevantes, salvo hotfix controlado;
6. CI antes/na integração;
7. após merge, conferir GitHub Pages;
8. se houver DB/Supabase, conferir estado real do banco;
9. mudanças de CSS/JS público devem usar cache-busting quando necessário;
10. nunca afirmar publicação apenas porque houve commit;
11. distinguir claramente: desenvolvimento / mergeado / deployado / ativo em produção;
12. testes com dados de produção devem ser transacionais/revertidos ou claramente isolados;
13. nunca expor service-role, senha, Client Secret, certificado ou chave privada.

---

## 15. PADRÃO DE EXECUÇÃO QUE DEVE SER PRESERVADO

Este é um requisito da própria SKILL, não apenas preferência de linguagem.

### O que está funcionando bem e deve continuar

- alta fidelidade ao comando do usuário;
- percepção rápida do que deve ser alterado e do que deve permanecer intacto;
- execução direta quando o pedido está claro;
- pouca ou nenhuma pergunta redundante;
- investigação do estado real antes de alterar sistemas vivos;
- uso de GitHub/Supabase diretamente quando apropriado;
- preservação de arquitetura validada;
- não recriar soluções já resolvidas;
- detectar inconsistências antes de publicar;
- corrigir bugs encontrados durante testes sem mascará-los;
- validar resultado final, não apenas intenção;
- respostas finais objetivas, distinguindo com precisão o que está pronto do que depende de terceiro.

### Erros que devem ser evitados

- interpretar um pedido pontual como autorização para redesenhar toda a LP;
- criar texto adicional não solicitado;
- alterar cores, layout, artes ou identidade incidentalmente;
- voltar a soluções abandonadas, como Magic Link;
- tratar clique do usuário como confirmação bancária na futura V5;
- sugerir troca de banco quando a decisão é usar Sicredi existente;
- usar números antigos de vagas sem consultar o banco;
- substituir arte aprovada por aproximação ou reconstrução;
- dizer que algo foi publicado antes de verificar deploy;
- simplificar a SKILL por conveniência técnica.

---

## 16. ARQUIVOS-CHAVE

Frontend / LP:

- `index.html`
- `styles.css`
- `script.js`

Módulo oficinas:

- `oficinas/config.js`
- `oficinas/core.js`
- `oficinas/api.js`
- `oficinas/public.js`
- `oficinas/admin.html`
- `oficinas/admin.css`
- `oficinas/admin.js`
- `oficinas/schema.sql`
- `oficinas/seed.sql`
- `oficinas/supabase-config.js`
- `oficinas/artwork-manifest.json`
- `oficinas/V5_FINANCEIRO_SICREDI.md`

Backend Supabase versionado:

- `supabase/functions/pix-checkout/`
- `supabase/functions/pix-webhook/`
- `supabase/functions/pix-status/`

CI:

- `.github/workflows/oficinas-tests.yml`

---

## 17. PRÓXIMAS ETAPAS NATURAIS — NÃO EXECUTAR SEM COMANDO

1. obter/liberar as credenciais API Pix do Sicredi da conta já existente;
2. cadastrar segredos com segurança no Supabase;
3. validar OAuth2 + mTLS em sandbox/homologação, se disponível;
4. registrar webhook Sicredi;
5. testar cobrança real/controle em ambiente seguro;
6. ligar `sicredi_api` em uma única oficina controladamente;
7. integrar UI final de QR Code/Copia e Cola + acompanhamento automático;
8. somente depois substituir definitivamente o fluxo manual.

Não avançar automaticamente para contratação, troca de banco, gateway ou serviço pago.

---

## 18. REGRA FINAL DE PRESERVAÇÃO

Este checkpoint deve ser tratado como **estado canônico da SKILL DE LP SOCIALIZANDO em 03/10/2026**.

Qualquer novo chat deve:

- carregar este estado como base;
- continuar do ponto atual;
- preservar competências e padrões de execução;
- não despersonalizar nem simplificar a skill;
- tratar futuras mudanças como evolução controlada;
- atualizar este checkpoint após versões relevantes.

**A prioridade é continuidade sem regressão.**
