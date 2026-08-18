# Configuração do agente Python corrigido

O arquivo `app_corrigido.py` corrige a indisponibilidade do modelo informada no erro anexado. A configuração original solicitava `gemini-2.5-flash`; a versão revisada adota `gemini-3.6-flash` como padrão e permite substituí-lo sem editar o código, por meio da variável `GEMINI_MODEL`. Consulte a disponibilidade do modelo para a sua chave no catálogo oficial do Gemini antes de colocá-lo em produção. [1]

## Dependências e execução

Em um ambiente virtual Python, instale as dependências completas e inicie o Streamlit com os comandos abaixo. O arquivo `requirements_corrigido.txt` cobre os imports do aplicativo e da rotina de ingestão, inclusive leitura de PDF, planilha e divisores de texto.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements_corrigido.txt
streamlit run app_corrigido.py
```

## Variáveis locais

Crie um arquivo `.env` apenas na sua máquina, ao lado de `app_corrigido.py`. Não envie esse arquivo para o repositório e não exponha uma chave no aplicativo móvel.

```dotenv
GOOGLE_API_KEY=sua_chave_real_fica_aqui
GEMINI_MODEL=gemini-3.6-flash
CHROMA_DIR=./chroma_db
CHROMA_COLLECTION=nrv_informatica
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
RAG_TOP_K=4
```

> **Importante:** se `EMBEDDING_MODEL` ou `EMBEDDING_DIMENSION` mudar, execute novamente `ingest_data.py` antes de abrir o agente. A base Chroma deve usar a mesma configuração empregada pela busca do aplicativo.

| Situação | Comportamento da versão corrigida | Ação necessária |
| --- | --- | --- |
| Modelo não encontrado ou descontinuado | Exibe uma orientação objetiva sobre `GEMINI_MODEL`, sem encerrar a tela com um traceback. | Atualize a variável para um modelo disponível na conta. |
| Diretório Chroma ausente ou vazio | Informa que a base de conhecimento ainda não foi criada. | Execute `ingest_data.py`. |
| Alteração de embeddings | Avisa sobre incompatibilidade de embeddings. | Recrie a base vetorial com a mesma configuração. |
| Chave ausente | Explica que `GOOGLE_API_KEY` ou `GEMINI_API_KEY` é obrigatório. | Crie ou corrija o `.env` local. |

## Referências

[1] [Google AI for Developers — Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
