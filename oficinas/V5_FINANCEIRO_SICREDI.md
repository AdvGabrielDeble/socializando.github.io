# Socializando — V5.0 Financeira / Sicredi Pix

Estado: fundação técnica implementada, ainda NÃO ativada nas oficinas públicas.

## Desenho canônico

Cadastro → reserva temporária → cobrança Pix Sicredi com txid único → QR/Copia e Cola → pagamento → webhook Sicredi → reconciliação na API Sicredi → confirmação da inscrição → vaga definitivamente ocupada → handoff de WhatsApp.

## Compatibilidade

- Oficinas atuais continuam em `payment_mode = manual_pix`.
- Ativação automática exige `payment_mode = sicredi_api`.
- Reserva padrão: 15 minutos, configurável de 5 a 60 minutos por oficina.
- A confirmação não faz segunda baixa de vaga.
- Pagamento fora do prazo ou com valor divergente vai para `review`, não confirma silenciosamente.

## Backend

- Edge Function `pix-checkout`: cria reserva, autentica no Sicredi via OAuth2 + mTLS, gera cobrança imediata e registra txid.
- Edge Function `pix-webhook`: recebe evento, consulta o Sicredi novamente pelo txid e somente então confirma a inscrição.
- Tabela `payment_transactions`: ledger de cobranças e liquidações.
- RPC pública somente de leitura de status: `get_public_registration_status`.
- RPCs financeiras de mutação: exclusivas de `service_role`.

## Segredos esperados no Supabase

Nenhum valor deve ser versionado no GitHub:

- SICREDI_PIX_ENV = sandbox | production
- SICREDI_PIX_CLIENT_ID
- SICREDI_PIX_CLIENT_SECRET
- SICREDI_PIX_CERT_PEM
- SICREDI_PIX_KEY_PEM
- SICREDI_PIX_RECEIVER_KEY
- SICREDI_PIX_WEBHOOK_TOKEN

## Pendência externa inevitável

A API Pix do Sicredi precisa estar habilitada para a conta PJ e fornecer Client ID, Client Secret e certificado mTLS. Sem essas credenciais, o backend permanece deliberadamente inativo e o checkout atual não muda.
