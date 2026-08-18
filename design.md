# Plano de Interface — NRV Informática

## Objetivo do produto

O aplicativo móvel permite que clientes da NRV Informática consultem a tabela de serviços, recebam uma estimativa de orçamento e descrevam um problema técnico em linguagem natural para receber uma orientação inicial. A experiência é desenhada para uso em retrato, com ações alcançáveis com uma mão e informações de preço sempre visíveis antes da confirmação.

## Diretrizes de interação

O aplicativo segue a convenção de navegação inferior do iOS, com três destinos principais: **Início**, **Serviços** e **Orçamento**. As ações principais ocupam a região inferior ou usam botões largos, com área de toque mínima confortável. A conversa aparece no Início para reduzir etapas, enquanto a criação de orçamento é explícita e controlada no destino dedicado.

## Telas

| Tela | Conteúdo principal | Funcionalidades |
| --- | --- | --- |
| Início | Saudação, acesso rápido aos serviços mais frequentes, conversa e sugestões de perguntas. | Enviar relato técnico, visualizar a resposta do assistente, iniciar um orçamento e abrir itens sugeridos. |
| Serviços | Lista filtrável da tabela fornecida, com categoria, preço, prazo e observação. | Pesquisar, filtrar por categoria, consultar detalhes e adicionar um serviço ao orçamento. |
| Orçamento | Itens selecionados, quantidade, subtotal de cada item, total e aviso de estimativa. | Alterar quantidade, remover item, copiar o resumo e compartilhar pelo sistema. |
| Detalhe do serviço | Serviço, categoria, preço, prazo médio, garantia ou observações. | Adicionar ou remover do orçamento e voltar à lista mantendo o contexto. |
| Painel administrativo | Formulário de serviço e lista de itens cadastrados no dispositivo. | Criar, editar, remover e restaurar a tabela inicial; as alterações são usadas pelo catálogo e pela conversa no mesmo dispositivo. |
| Informações do assistente | Escopo do atendimento e diagnóstico da indisponibilidade do modelo original. | Explicar que estimativas dependem de análise técnica e orientar o uso seguro do chat. |

## Fluxos principais

**Consulta por conversa:** o cliente abre o Início, toca em uma sugestão ou escreve o sintoma, envia a mensagem e recebe uma resposta que usa exclusivamente o catálogo NRV. Quando há correspondência, a resposta orienta a abrir o serviço relacionado e adicioná-lo ao orçamento.

**Montagem de orçamento:** o cliente navega em Serviços, encontra um item pela busca ou filtro, abre o detalhe e toca em “Adicionar ao orçamento”. No destino Orçamento, ajusta quantidades, revisa o total e compartilha o resumo para continuidade do atendimento.

**Correção do agente original:** a aplicação usa o modelo de linguagem exclusivamente no servidor, com catálogo de serviços injetado como fonte de contexto. Nenhuma chave de API é exposta no dispositivo e falhas de chamada recebem uma mensagem de contingência compreensível.

## Cores e tom visual

| Papel | Cor | Uso |
| --- | --- | --- |
| Azul NRV | `#075985` | Ações principais, ícones ativos e destaques de confiança. |
| Ciano de suporte | `#0E7490` | Elementos secundários e indicadores de atendimento. |
| Fundo gelo | `#F7FAFC` | Fundo claro, com aparência técnica e limpa. |
| Superfície branca | `#FFFFFF` | Cartões, campos de texto e orçamentos. |
| Grafite | `#102A43` | Títulos, valores e dados prioritários. |
| Verde de confirmação | `#15803D` | Totais, sucesso e ações concluídas. |
| Âmbar de aviso | `#B45309` | Avisos sobre estimativa e disponibilidade. |

O tom é direto, técnico e acolhedor. O aplicativo não promete diagnóstico definitivo: identifica possibilidades, mostra serviços cadastrados e reforça que o valor final requer avaliação técnica.
