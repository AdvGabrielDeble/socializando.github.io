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


## Ajuste v4.4.5
- removidas as frases do topo do palco animado: “Em cena”, “Cada habilidade entra em movimento.” e “Um personagem por vez cruza o espaço, apresenta sua pergunta-chave e segue a jornada.”;
- mantida a animação dos personagens e os balões individuais de pensamento;
- ajustado o espaçamento do palco para ocupar melhor a área da galeria.
