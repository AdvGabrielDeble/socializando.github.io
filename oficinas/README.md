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
- Fábrica dos Squishs Mágicos — 10/10/2026, 15h30 às 17h, R$ 50,00, a partir de 5 anos, 15 vagas.
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

Os hashes, dimensões e nomes de destino estão registrados em `artwork-manifest.json`. As imagens devem ser transferidas byte a byte para os caminhos indicados, sem edição, recorte, recompressão ou conversão. A transferência binária para o repositório ainda é uma pendência técnica; até ela ser concluída, `image_url` permanece nulo no seed para impedir que o sistema aponte para um arquivo inexistente.

## Regra de publicação

Desenvolver e validar primeiro na branch `feature/oficinas-v4.6.0`. A branch `main` permanece como versão publicada estável até a aprovação final.
