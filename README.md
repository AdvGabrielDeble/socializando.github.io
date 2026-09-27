# Socializando LP — v4 Reconstruída

Esta versão foi reconstruída com foco em corrigir os problemas apontados na versão anterior:

- logo aplicado sem badge branco ou fundo colado;
- marca integrada ao layout com PNG transparente;
- hero mais limpo e mais premium;
- personagens usados de forma controlada e concentrados na seção das 5 habilidades;
- remoção do uso do Neo com bússola;
- mais respiro visual, mais hierarquia e transições mais elegantes.

## Estrutura

- `index.html` — estrutura da landing page
- `styles.css` — estilos visuais e responsivos
- `script.js` — animações suaves, scroll progress, tilt e links do WhatsApp
- `assets/` — logos, sprites e imagens

## Ajuste obrigatório antes da publicação

Abrir `script.js` e substituir:

```js
const WHATSAPP_NUMBER = "INSERIR_NUMERO_AQUI";
```

pelo número final no formato internacional, por exemplo:

```js
const WHATSAPP_NUMBER = "5553999999999";
```

## Observação

Esta v4 evita o erro de transformar o logo em “cartão colado”. A aplicação foi reconstruída para privilegiar uma leitura mais limpa e mais premium.


## Ajuste v4.1
- remoção do elemento gráfico maior do hero;
- ampliação do card informativo menor no hero;
- redução do logo do cabeçalho flutuante para melhor proporção visual.


## Ajuste v4.2
- redução adicional do logo no cabeçalho flutuante para deixá-lo mais proporcional e elegante.


## Ajuste v4.3
- cabeçalho flutuante com largura mais contida;
- logo do cabeçalho reduzido novamente;
- altura, espaçamentos e CTA do topo suavizados para um visual mais elegante.


## Ajuste v4.3.1
- removida a frase solicitada na seção das 5 habilidades.


## Ajuste v4.3.2
- removida a frase solicitada na seção de galeria/por dentro do Socializando.


## Ajuste v4.3.4
- galeria atualizada com as fotos adicionais enviadas;
- inclusão de emojis nas imagens em que participantes podem ser identificados;
- manutenção do layout da galeria sem corte agressivo, preservando melhor o enquadramento das fotos.


## Ajuste v4.3.5
- reduzido drasticamente o uso de emojis na galeria;
- mantidos apenas em foto estratégica com rostos infantis claramente visíveis;
- removidos os emojis das fotos em que aparece equipe e das imagens em que a marcação visual ficou excessiva.


## Ajuste v4.3.6
- removidos todos os emojis da galeria;
- mantidas as fotos da galeria em versão limpa, sem marcações sobre os rostos.


## Ajuste v4.3.7
- removida a última foto da galeria para manter o padrão visual em blocos de 3 imagens.
- galeria mantida com 10 imagens, sem emojis.


## Atualização desta versão
- Galeria reorganizada em grid controlado.
- Espaço reservado oficialmente para animação sequencial dos personagens com balões de pensamento.


## Ajuste v4.4.1
- WhatsApp vinculado ao número +55 53 99957-5359.
- Número técnico configurado em `script.js` como `5553999575359`.


## Ajuste v4.4.2
- corrigidos os sprites da personagem Conny no palco animado;
- removidos fragmentos visuais indevidos que apareciam acima da cabeça ou nas bordas durante o salto/caminhada;
- mantido o restante da LP sem alterações.


## Ajuste v4.4.3
- não foi encontrado um asset pronto do termômetro da Viva entre os arquivos disponíveis;
- por isso, foi criada e inserida uma versão limpa do termômetro no sprite especial da personagem Viva;
- o objeto passa a aparecer na animação de exposição da habilidade, alinhado ao padrão dos demais personagens.


## Ajuste v4.4.4
- configurado favicon com o logo do projeto;
- adicionados arquivos favicon em PNG e ICO para melhorar compatibilidade entre navegadores;
- mantido também o favicon SVG já existente.


## Ajuste v4.4.4.2
- base restabelecida diretamente da versão v4.4.4;
- texto “Cada habilidade entra em movimento.” alterado para “As habilidades tem uma mensagem para você”;
- frase “Um personagem por vez cruza o espaço, apresenta sua pergunta-chave e segue a jornada.” removida visualmente;
- preservada a linha/altura original do bloco para não alterar proporção do palco;
- sem alteração em CSS, JS, animação, tamanho do palco ou assets.


## Ajuste v4.4.4.4
- correção feita a partir da versão v4.4.4.2;
- removidos integralmente os textos da seção de dúvidas: “As informações iniciais ficam claras. Os detalhes ficam para o WhatsApp.” e “A página apresenta a ideia do projeto. Informações sobre grupos, idades, datas e valores ficam concentradas no atendimento direto.”;
- mantido em destaque apenas “Dúvidas comuns” como título da seção;
- conferido no arquivo final que os textos removidos não permanecem no index.html.


## Ajuste v4.4.4.5
- na pergunta “Existe divisão por idade?”, a resposta foi alterada para: “A composição dos grupos depende da maturidade dos participantes.”;
- sem alteração em layout, CSS, JS, animação, palco ou assets.


## Ajuste v4.5.0 — SEO e indexação

- pacote técnico inicial para indexação e compartilhamento;
- domínio canônico configurado para `https://www.projetosocializando.com.br/`;
- `title` e `description` otimizados para Socializando, Bagé e habilidades socioemocionais;
- adicionadas tags Open Graph/Twitter Card;
- criada imagem `assets/socializando-og.png` para compartilhamento;
- adicionados dados estruturados JSON-LD: Organization, WebSite, WebPage e FAQPage;
- `robots.txt` e `sitemap.xml` atualizados;
- adicionado `CNAME` para GitHub Pages;
- criado `SEO-SEARCH-CONSOLE.md` com próximos passos.


## Ajuste v4.5.1 — SEO: páginas internas

- criadas 8 páginas internas de ranqueamento;
- atualizado `sitemap.xml` com as novas URLs;
- criado `seo-pages.css` para as páginas internas e links do rodapé;
- página inicial recebeu apenas links internos no rodapé, para evitar páginas órfãs;
- dados estruturados reforçados com `LocalBusiness`, `WebPage`, `BreadcrumbList` e `FAQPage`;
- mantidos assets, animação principal, WhatsApp e design-base da LP.


## Ajuste v4.5.2 — atualização do WhatsApp
- número oficial de WhatsApp atualizado para +55 53 99951-9569;
- número técnico configurado como `5553999519569`;
- mantidos layout, SEO, páginas internas, animações e demais conteúdos sem alterações.


## Ajuste v4.6.0 — Gestão de Oficinas

- adicionada a seção `Oficinas` à LP, entre Temporada e Galeria, preservando o design-base;
- item `Oficinas` incluído no menu superior;
- oficinas estruturadas como experiências integradas à LP, com arte canônica, turmas, preço, idade, vagas e inscrição no mesmo painel;
- artes atualizadas de 10/10/2026 incorporadas integralmente, sem recorte, recompressão ou alteração visual;
- nomenclatura oficial atualizada para `Fábrica dos Squishy Mágicos` e `Paper Squishy`;
- Expedição Jurássica: 10/10/2026, 14h–15h30, 15 vagas, R$ 50,00, a partir de 5 anos;
- Fábrica dos Squishy Mágicos: 10/10/2026, 15h30–17h, 15 vagas, R$ 50,00, a partir de 5 anos;
- suporte a múltiplas turmas da mesma experiência em datas distintas, com contador independente;
- Pix direto sem gateway; somente pagamento confirmado pela equipe ocupa vaga;
- Supabase Free como backend, sem contratação de serviço pago;
- painel administrativo protegido por autenticação passwordless;
- testes automatizados e validações de integridade dos assets incluídos;
- desenvolvimento mantido na branch `feature/oficinas-v4.6.0` até aprovação final de publicação.


## Ajuste v4.6.1 — Mobile + controle de inscrições no WhatsApp

- corrigido o menu mobile: a barra superior passa a ter botão `Menu` e exibe Projeto, Habilidades, Temporada, Oficinas, Galeria e Dúvidas;
- o menu mobile fecha ao selecionar uma seção e também por `Esc`;
- preservado o menu desktop existente;
- após o responsável informar que realizou o Pix, o registro permanece salvo no Supabase e o site prepara uma mensagem de controle para o WhatsApp oficial `+55 53 99951-9569`;
- a mensagem inicia pelo nome da oficina e inclui data, horário, responsável, WhatsApp, e-mail, criança, idade, nascimento, observações, valor do Pix, referência e situação do pagamento;
- o token público da inscrição nunca é enviado ao WhatsApp;
- o consentimento do formulário informa expressamente o encaminhamento dos dados ao WhatsApp oficial para conferência da inscrição e do pagamento;
- assets alterados receberam cache-busting `v=461` para evitar que celulares mantenham CSS/JS antigos em cache.


## Ajuste v4.6.2 — Pix ocupa vaga + fechamento do formulário

- corrigido o botão X do formulário de inscrição: ele fecha o modal explicitamente e não depende da validação dos campos obrigatórios;
- o cadastro inicial continua sem consumir vaga;
- ao responsável informar que o Pix foi efetivamente realizado, o status passa para `payment_reported` e uma vaga é abatida imediatamente;
- a confirmação administrativa posterior não abate uma segunda vaga; apenas valida o pagamento já contado;
- cancelamento de uma inscrição em `payment_reported` ou `confirmed` devolve a vaga;
- o contador público é recarregado imediatamente após o Pix ser informado como efetuado;
- somente depois dessa transição é preparada a mensagem para o WhatsApp oficial;
- a mensagem de WhatsApp identifica que a vaga já foi abatida e permanece aguardando conferência da equipe.
