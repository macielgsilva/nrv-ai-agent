# Diagnóstico técnico do agente NRV

O erro ocorre antes da recuperação no ChromaDB: o arquivo `app.py` instancia `ChatGoogleGenerativeAI` com `gemini-2.5-flash`, enquanto a própria API informa que esse identificador deixou de estar disponível para novos usuários. A chamada falha no momento de `chain.invoke`, mas a origem está na configuração de `GEMINI_MODEL`, não no prompt, no retriever ou na tabela de preços.

| Item analisado | Situação | Correção aplicada ou recomendada |
| --- | --- | --- |
| Modelo conversacional | `gemini-2.5-flash` indisponível para novos usuários. | Adotar `gemini-3.6-flash`, identificador estável documentado pela Google. [1] |
| Chave de API | O código aceita `GOOGLE_API_KEY` ou `GEMINI_API_KEY`. | Manter a validação, sem expor a chave no app móvel. |
| Embeddings e Chroma | Os dois scripts usam a mesma configuração de embeddings e dimensão. | Manter os valores alinhados e recriar a base caso se alterem. |
| Dependências | A lista não declara todos os módulos importados pela ingestão. | Acrescentar `langchain-community`, `langchain-text-splitters`, `pypdf`, `pandas` e `openpyxl`, com versões compatíveis. |

Além da alteração do identificador do modelo, a versão corrigida verificará as configurações no início da execução e apresentará mensagens mais objetivas para falhas de modelo e para a necessidade de recriar a base vetorial. No aplicativo móvel, a conversa será executada somente no servidor, utilizando o catálogo NRV como contexto delimitado e sem chave Google no dispositivo.

## Referências

[1] [Google AI for Developers — Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
