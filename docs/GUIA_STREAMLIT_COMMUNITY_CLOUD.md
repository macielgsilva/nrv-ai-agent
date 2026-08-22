# Publicação de teste no Streamlit Community Cloud

**Autor:** Manus AI

**Finalidade:** publicar uma demonstração do agente RAG NRV sem versionar a chave Gemini.

## Limites desta modalidade

O Streamlit Community Cloud é adequado para uma demonstração controlada. O ambiente de arquivos não deve ser tratado como armazenamento durável; por isso, este projeto recria a coleção ChromaDB a partir da planilha pública de serviços quando necessário. A planilha incluída em `data/` foi revisada e contém apenas catálogo, preços estimados, prazos e observações, sem dados pessoais.

> Não publique documentos internos, chamados de clientes, credenciais ou uma cópia de `chroma_db/`. Para produção, mantenha a implantação OCI com armazenamento e backups próprios.

## Arquivos preparados

| Arquivo | Uso |
|---|---|
| `app.py` | Ponto de entrada indicado na plataforma; encaminha para a aplicação corrigida. |
| `app_corrigido.py` | Interface Streamlit, regras RAG e tratamento de erros. |
| `ingest_data.py` | Reconstrói a coleção a partir da tabela aprovada. |
| `data/Tabela_Servicos_NRV.xlsx` | Fonte pública de demonstração. |
| `requirements.txt` | Dependências Python detectadas pelo Community Cloud. |
| `.streamlit/secrets.toml.example` | Modelo de segredos; não contém chave real. |

## Publicar a partir do GitHub

1. Entre em [share.streamlit.io](https://share.streamlit.io/) usando a conta GitHub que possui acesso ao repositório `macielgsilva/nrv-ai-agent`.
2. Clique em **Create app** e selecione o repositório, a ramificação `main` e o arquivo **`app.py`**.
3. Abra **Advanced settings → Secrets** e cole o conteúdo abaixo, substituindo somente o valor da chave:

```toml
GOOGLE_API_KEY = "SUA_CHAVE_GEMINI"
GEMINI_MODEL = "gemini-3.6-flash"
EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = "768"
CHROMA_COLLECTION = "nrv_informatica"
CHROMA_DIR = "/tmp/nrv_chroma"
RAG_TOP_K = "4"
AUTO_BUILD_CHROMA = "true"
EXCEL_FILE = "data/Tabela_Servicos_NRV.xlsx"
```

4. Clique em **Deploy** e aguarde a instalação. A primeira inicialização cria a coleção vetorial e pode levar mais tempo que as posteriores.
5. Teste uma pergunta que esteja na tabela, como preço de limpeza interna, e outra não coberta, como reparo de impressora. A segunda deve solicitar avaliação técnica, não inventar um valor.

## Segurança e operação

| Controle | Aplicação neste projeto |
|---|---|
| Chave Gemini | Inserida apenas na interface de segredos; `.streamlit/secrets.toml` é ignorado pelo Git. |
| Dados públicos | A demonstração usa somente `data/Tabela_Servicos_NRV.xlsx`, revisada antes da inclusão. |
| Base vetorial | Criada em diretório temporário e excluída do repositório. |
| Atualização de preços | Revise a planilha, substitua o arquivo `data/Tabela_Servicos_NRV.xlsx`, confirme que não há dados privados, envie um commit e reinicie a aplicação. |
| Produção | Use a VM OCI, domínio e HTTPS quando precisar de persistência, backup e controle operacional. |

As dependências devem ficar em `requirements.txt` na raiz ou junto ao arquivo de entrada. Os segredos devem ser adicionados na área de configurações da aplicação e não podem ser enviados ao Git. [1] [2]

## Referências

[1]: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies "Dependências no Streamlit Community Cloud"
[2]: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/secrets-management "Gestão de segredos no Streamlit Community Cloud"
