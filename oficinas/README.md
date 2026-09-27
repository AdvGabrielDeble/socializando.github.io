# Socializando — Módulo de Oficinas v4.6.0

Este diretório concentra exclusivamente o módulo de gestão de vagas e inscrições em oficinas.

## Escopo fechado

- preservar integralmente o design-base da LP atual;
- exibir oficinas abertas e vagas disponíveis;
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
- chave Pix oficial;
- dados da primeira oficina (nome, data, horário, valor e capacidade).

Nenhuma dessas informações sensíveis ou operacionais deve ser inventada no código.

## Regra de publicação

Desenvolver e validar primeiro na branch `feature/oficinas-v4.6.0`. A branch `main` permanece como versão publicada estável até a aprovação final.
