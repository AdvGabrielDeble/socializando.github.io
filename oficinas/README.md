# Socializando — Módulo de Oficinas v4.6.0

Este diretório concentra exclusivamente o módulo de gestão de vagas e inscrições em oficinas. Cada registro de `workshops` representa uma turma/sessão concreta; turmas da mesma experiência são agrupadas por `experience_key`, permitindo abrir uma segunda turma em outra data sem duplicar o conceito visual da oficina.

## Escopo fechado

- preservar integralmente o design-base da LP atual;
- exibir oficinas abertas, suas turmas/datas e vagas disponíveis;
- permitir múltiplas turmas da mesma oficina em datas distintas, cada uma com capacidade e contador próprios;
- cadastrar responsável e criança;
- gerar Pix direto para a chave do Socializando;
- após o pagamento, a inscrição fica como `payment_reported`;
- a vaga só é abatida quando a equipe confirmar o pagamento;
- permitir confirmação, cancelamento e consulta de inscritos no painel administrativo;
- sem gateway de pagamento e sem taxa de intermediador no MVP.

## Estados da inscrição

1. `pending_payment` — cadastro concluído, Pix ainda não informado como pago.
2. `payment_reported` — participante informou que realizou o Pix.
3. `confirmed` — pagamento conferido pela equipe. Somente este estado consome vaga.
4. `cancelled` — inscrição cancelada.

## Regra de vagas

`vagas_disponiveis = capacidade_total - inscrições_confirmadas`

Cadastros pendentes não reduzem o contador público.

## Arquitetura do MVP

- Frontend: GitHub Pages, reaproveitando a LP atual.
- Dados: Supabase/PostgreSQL.
- Administração: Supabase Auth + painel próprio do módulo.
- Pix: QR Code estático / Copia e Cola gerado diretamente para a chave informada, com valor da oficina e referência da inscrição.

## Pendências para ativação

Antes de conectar o módulo à LP publicada, ainda são necessários:

- URL do projeto Supabase;
- chave pública `anon` do Supabase;
- criação do projeto Supabase e suas credenciais públicas (URL + anon key);
- dados das turmas adicionais quando forem abertas; a primeira rodada já está definida.

Nenhuma dessas informações sensíveis ou operacionais deve ser inventada no código.

## Dados operacionais já aprovados

- Expedição Jurássica — 10/10/2026, 14h às 15h30, R$ 50,00, a partir de 5 anos, 15 vagas.
- Fábrica dos Squishy Mágicos — 10/10/2026, 15h30 às 17h, R$ 50,00, a partir de 5 anos, 15 vagas.
- Chave Pix CNPJ: `59.380.867/0001-62`.
- WhatsApp oficial: `+55 53 99951-9569`.

## Segunda turma / nova data

A abertura de uma nova turma reutiliza `experience_key`, título, descrição, preço e idade mínima, mas cria uma nova sessão com outro `slug`, data, horário e capacidade. Cada sessão tem inscrições e contador de vagas independentes.

As artes aprovadas atuais são datadas. Por isso, uma nova turma em outra data **não herda automaticamente a imagem da turma anterior**: nasce com `image_url = null` até que exista uma arte específica aprovada para aquela data. Isso impede que a LP mostre, por exemplo, uma arte escrita “10 de outubro” para uma turma realizada em outra data.

## Ativação do backend

1. Criar um projeto Supabase.
2. Executar `schema.sql` no SQL Editor.
3. Executar `seed.sql` para cadastrar as duas turmas iniciais.
4. Criar o usuário administrativo no Supabase Auth.
5. Inserir o UUID desse usuário em `public.admin_users`.
6. Copiar a URL pública do projeto e a chave pública `anon` para `supabase-config.js`.
7. Nunca inserir a chave `service_role` em arquivos servidos pelo GitHub Pages.
8. Validar o fluxo completo em branch/teste antes de qualquer merge para `main`.

## Artes canônicas

Os hashes, dimensões e nomes de destino estão registrados em `artwork-manifest.json`. As imagens devem ser transferidas byte a byte para os caminhos indicados, sem edição, recorte, recompressão ou conversão. Os dois PNGs atualizados já estão no repositório e os `image_url` das turmas iniciais apontam para esses assets canônicos.

## Regra de publicação

Desenvolver e validar primeiro na branch `feature/oficinas-v4.6.0`. A branch `main` permanece como versão publicada estável até a aprovação final.


## Integração visual das artes

As artes aprovadas não são tratadas como miniaturas ou JPGs decorativos. O frontend usa um painel experiencial integrado à LP:

- composição desktop em duas áreas, com a arte canônica ocupando a zona visual e a operação de vagas/inscrição ocupando a zona funcional;
- paleta contextual por experiência, limitada ao entorno do módulo e sem redesenhar a identidade global da LP;
- contador de vagas posicionado na transição entre arte e conteúdo funcional;
- arte exibida inteira, sem `object-fit: cover`, sem proporção forçada, sem recorte e sem recompressão;
- mobile em composição vertical: arte inteira → ponte de disponibilidade → dados/inscrição;
- múltiplas turmas permanecem dentro da mesma experiência, mas cada turma conserva seu próprio `image_url`; uma arte com data impressa nunca é reutilizada automaticamente para outra data;
- quando uma nova turma ainda não possui arte específica, o sistema exibe somente um estado visual institucional neutro, sem fabricar ou alterar a criação existente.

Os dois PNGs canônicos estão em `assets/oficinas/` e foram montados com validação SHA-256 contra os hashes registrados em `artwork-manifest.json`.


## Acesso administrativo passwordless

O primeiro acesso aprovado é `gabrieldeblegd@gmail.com`. A autorização real é feita no banco por `admin_emails` e pelo e-mail presente no JWT emitido pelo Supabase Auth; não há senha administrativa armazenada no repositório.

Fluxo:
1. abrir `/oficinas/admin.html`;
2. solicitar o link de acesso;
3. o Supabase envia um Magic Link ao e-mail autorizado;
4. ao retornar para `https://www.projetosocializando.com.br/oficinas/admin.html`, o token é capturado e removido imediatamente da URL;
5. as políticas RLS só liberam o painel se o e-mail autenticado constar na allowlist administrativa.

Antes da publicação final, o Supabase Auth precisa ter a URL acima cadastrada em **Authentication → URL Configuration → Redirect URLs**. Essa configuração é externa ao schema PostgreSQL e não deve ser simulada no código.
