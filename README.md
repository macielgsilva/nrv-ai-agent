# 🤖 Agente de IA para Orçamentos - NRV Informática

**Autor:** [Maciel Silva](https://github.com/macielgsilva)
**Desafio:** Criação de Agent de IA para Service Desk com deploy na OCI.

Este repositório contém a implementação de um agente de Inteligência Artificial generativa projetado para otimizar o atendimento de Nível 1 da empresa fictícia NRV Informática. Utilizando técnicas avançadas de RAG (Retrieval-Augmented Generation), o agente processa documentos corporativos e tabelas de preços para fornecer diagnósticos prévios e orçamentos de manutenção.

---

## 🏗️ Arquitetura da Solução

O projeto foi construído utilizando as seguintes tecnologias:
* **Linguagem:** Python 3.10+
* **LLM:** Google Gemini Pro (via `langchain-google-genai`)
* **Framework AI:** LangChain
* **Vector Database:** ChromaDB (local in-memory)
* **Frontend:** Streamlit
* **Infraestrutura Cloud:** Oracle Cloud Infrastructure (OCI Compute)

### Fluxo de Dados (Data Flow)
1. **Ingestão:** O script `ingest_data.py` extrai dados não estruturados de manuais em PDF (`pypdf`) e dados estruturados de planilhas de preços (`pandas`).
2. **Vetorização:** Os textos são convertidos em *embeddings* através do modelo de embeddings do Google e armazenados no ChromaDB.
3. **Recuperação (Retrieval):** Quando o cliente faz uma pergunta via Streamlit, o sistema busca os trechos semanticamente mais próximos no banco vetorial.
4. **Geração (Generation):** O contexto recuperado é injetado no prompt do Gemini Pro, que gera uma resposta humanizada, consultiva e estritamente baseada nos dados da empresa.

---

## 💬 Exemplos de Perguntas e Respostas

> **Usuário:** Meu notebook esquenta muito e desliga sozinho após alguns minutos. Quanto custa o conserto e qual o prazo?
>
> **Agente:** Esse sintoma geralmente indica superaquecimento devido ao acúmulo de sujeira no cooler ou ressecamento da pasta térmica. O serviço recomendado é a Limpeza Interna e Troca de Pasta Térmica, que custa R$ 130,00 e o prazo médio é de 1 dia útil. Vale ressaltar que o uso contínuo nessas condições pode danificar a placa-mãe. Gostaria de abrir uma ordem de serviço?

> **Usuário:** Quanto vocês cobram para instalar o Windows e salvar uns 200GB de fotos minhas?
>
> **Agente:** Para a formatação e instalação do Sistema Operacional (Windows ou Linux), o valor é de R$ 150,00, com prazo de 1 dia útil. O serviço de Backup de Dados (até 500GB) custa R$ 100,00. O valor total estimado do seu orçamento seria de R$ 250,00. Nossos serviços possuem garantia padrão de 90 dias.

---

## 🚀 Instruções para Execução Local

1. **Clone o repositório:**
   ```bash
git clone [https://github.com/macielgsilva/nrv-ai-agent.git](https://github.com/macielgsilva/nrv-ai-agent.git)
cd nrv-ai-agent
```

---

## ☁️ Teste no Streamlit Community Cloud

O projeto também está preparado para uma **demonstração pública temporária** no Streamlit Community Cloud. O arquivo de entrada é `app.py`, as dependências estão em `requirements.txt` e a base vetorial é reconstruída a partir de `data/Tabela_Servicos_NRV.xlsx` quando `AUTO_BUILD_CHROMA=true` está configurado nos segredos da plataforma.

> A chave Gemini nunca deve ser incluída no Git, em `app.py`, no arquivo de planilha ou em mensagens de commit. Informe-a somente em **Advanced settings → Secrets** ao criar a aplicação no Streamlit Community Cloud. A base `chroma_db/` continua ignorada, pois é derivada e não deve ser tratada como armazenamento persistente nessa modalidade. [4] [5]

Consulte o procedimento completo, o bloco de segredos sem valores reais e a validação recomendada em [`docs/GUIA_STREAMLIT_COMMUNITY_CLOUD.md`](docs/GUIA_STREAMLIT_COMMUNITY_CLOUD.md). Para produção, backup e operação contínua, mantenha o caminho de implantação na OCI descrito nas seções seguintes.

---

## ✅ Checklist de pré-deploy — Oracle Cloud Infrastructure

Antes de publicar o agente NRV em uma instância OCI, confirme cada item abaixo. O objetivo é evitar a exposição de segredos, a publicação de uma base RAG incompleta e falhas de conectividade após a criação da VM.

### Código, dependências e segurança

- [ ] O repositório contém `app.py`, `ingest_data.py`, `requirements.txt`, a planilha de serviços e os documentos de conhecimento necessários.
- [ ] O projeto usa a versão corrigida do modelo, com `GEMINI_MODEL=gemini-3.6-flash` configurado no `.env`.
- [ ] O arquivo `.env` contém `GOOGLE_API_KEY`, mas está listado no `.gitignore` e não aparece em `git status`.
- [ ] Não existem chaves, tokens, arquivos `.pem`, diretórios `.venv/`, logs ou `chroma_db/` no commit que será enviado ao GitHub.
- [ ] As dependências foram instaladas em ambiente virtual com `pip install -r requirements.txt`.

### Dados e validação local

- [ ] `python ingest_data.py` terminou sem erro e criou uma coleção ChromaDB com dados.
- [ ] O agente foi iniciado localmente com `streamlit run app.py` e aberto em `http://localhost:8501`.
- [ ] Pelo menos duas perguntas foram testadas com preços e prazos existentes na planilha.
- [ ] Uma pergunta sem cobertura na base foi testada para confirmar que o agente solicita análise técnica, em vez de inventar preço ou diagnóstico.
- [ ] O fluxo foi testado no sistema operacional que será usado para a manutenção, incluindo PowerShell no Windows quando aplicável.

### OCI, rede e acesso

- [ ] A instância Compute usa uma imagem Linux suportada, possui IP público e uma chave SSH OpenSSH foi guardada em local seguro. [1]
- [ ] O acesso SSH na porta 22 está restrito ao IP administrativo sempre que possível.
- [ ] A Network Security Group ou Security List libera TCP 80 e 443 para o público, sem expor a porta 8501 diretamente. NSGs e Security Lists funcionam como firewalls virtuais da instância. [2]
- [ ] O firewall do sistema operacional permite apenas as portas necessárias ao Nginx e à administração remota.
- [ ] O servidor possui espaço suficiente para o ambiente virtual, documentos de origem, logs e a base ChromaDB persistente.

### Serviço, proxy e HTTPS

- [ ] O `.env` foi criado diretamente na VM, com permissões restritas (`chmod 600 .env`).
- [ ] A ingestão foi executada na VM após a cópia ou clonagem do projeto.
- [ ] O serviço `systemd` inicia o Streamlit em `127.0.0.1:8501`, reinicia em caso de falha e está habilitado no boot.
- [ ] O Nginx foi configurado como proxy reverso e `sudo nginx -t` conclui sem erro.
- [ ] O domínio possui registro DNS apontando para o IP público da instância e o certificado HTTPS foi emitido e validado.
- [ ] `systemctl status nrv-ai-agent`, `curl -I http://127.0.0.1:8501` e o acesso HTTPS público foram verificados após a publicação.

### Operação e recuperação

- [ ] Existe uma rotina definida para atualizar a tabela e executar novamente `ingest_data.py` quando os dados mudarem.
- [ ] Os logs do serviço podem ser consultados com `sudo journalctl -u nrv-ai-agent -f`.
- [ ] O procedimento de atualização está documentado: `git pull`, instalação de dependências quando necessário, nova ingestão e `sudo systemctl restart nrv-ai-agent`.
- [ ] O reinício da VM foi testado para confirmar que Nginx e o serviço do agente retornam automaticamente.

---

## ✅ Checklist pós-deploy — disponibilidade e resposta do agente

Execute este checklist após o primeiro deploy e depois de cada atualização relevante. Registre a data, o domínio testado e qualquer falha encontrada para facilitar a manutenção do ambiente.

### Disponibilidade do servidor

- [ ] O serviço está ativo: `sudo systemctl is-active nrv-ai-agent` retorna `active`.
- [ ] O Nginx está ativo: `sudo systemctl is-active nginx` retorna `active`.
- [ ] A verificação interna do Streamlit responde sem erro: `curl -fsS http://127.0.0.1:8501/_stcore/health`.
- [ ] O domínio público responde por HTTPS: `curl -I https://SEU_DOMINIO` retorna um status de sucesso ou redirecionamento válido.
- [ ] O certificado é válido, corresponde ao domínio e não apresenta aviso no navegador.
- [ ] A porta 8501 não está acessível diretamente pela internet; o acesso público ocorre somente pelas portas 80 e 443 do proxy reverso.

### Resposta e integridade do agente

- [ ] A página inicial do agente abre em navegador anônimo, sem erro visual ou demora anormal de carregamento.
- [ ] Uma pergunta coberta pela tabela retorna o serviço correto, preço e prazo compatíveis com a fonte.
- [ ] Uma pergunta que combine mais de um serviço apresenta os itens de forma clara e trata o resultado como pré-orçamento.
- [ ] Uma pergunta fora da base não produz preço, procedimento ou diagnóstico inventado; o agente orienta avaliação técnica.
- [ ] O assistente preserva o tom profissional e o aviso de que a confirmação depende de análise técnica.
- [ ] A consulta não expõe chave de API, conteúdo do `.env`, caminhos internos da VM ou mensagens de exceção ao usuário final.

### Logs, resiliência e recuperação

- [ ] `sudo journalctl -u nrv-ai-agent -n 100 --no-pager` não contém erros recorrentes de modelo, credencial, ChromaDB ou dependências.
- [ ] `sudo journalctl -u nrv-ai-agent -f` foi acompanhado durante pelo menos uma consulta bem-sucedida ao agente.
- [ ] `sudo nginx -t` continua válido após qualquer alteração no proxy e os logs de erro do Nginx não mostram falhas de encaminhamento.
- [ ] Após `sudo systemctl restart nrv-ai-agent`, o serviço retorna a `active` e responde a uma consulta funcional.
- [ ] Após uma reinicialização planejada da VM, Nginx e `nrv-ai-agent` iniciam automaticamente e o domínio volta a responder.
- [ ] Existe uma cópia de segurança recente do código, da planilha de serviços, dos documentos de origem e do diretório `chroma_db/` em local protegido.

### Encerramento da validação

- [ ] A data da validação, o responsável, o domínio e o resultado das consultas foram registrados.
- [ ] Qualquer falha foi corrigida antes de divulgar a URL ao público.
- [ ] O fluxo de atualização foi comunicado à equipe: atualizar código, instalar dependências quando necessário, executar `ingest_data.py`, reiniciar o serviço e repetir este checklist.

---

## 🧩 Skill empacotada: `rag-service-agent-mobile-oci`

Este projeto inclui a habilidade reutilizável `rag-service-agent-mobile-oci`, criada para orientar trabalhos que envolvam **agentes RAG de atendimento**, correção de aplicações Python/Streamlit, construção de aplicativo móvel de orçamento e documentação de publicação na Oracle Cloud Infrastructure. Ela transforma o processo executado neste projeto em um fluxo consistente, com cuidados de segurança, testes e materiais de implantação.

### Localização e estrutura

A habilidade está disponível dentro do próprio repositório, no caminho abaixo. Mantenha os nomes e a organização para preservar as referências internas.

```text
skills/
└── rag-service-agent-mobile-oci/
    ├── SKILL.md
    ├── references/
    │   └── oci-streamlit.md
    └── templates/
        ├── nginx-streamlit.conf.tpl
        └── streamlit-agent.service.tpl
```

| Arquivo ou diretório | Como utilizar |
| --- | --- |
| `SKILL.md` | Contém o fluxo principal, gatilhos de uso, critérios de validação e limites de segurança. Deve ser lido primeiro. |
| `references/oci-streamlit.md` | Serve como referência para validação local, GitHub, OCI, health checks e recuperação. |
| `templates/streamlit-agent.service.tpl` | É o modelo do serviço `systemd`; personalize usuário, diretório, nome do app e caminho do ambiente virtual antes de instalar. |
| `templates/nginx-streamlit.conf.tpl` | É o modelo de proxy reverso Nginx; personalize domínio e destino local antes de habilitar. |

### Quando usar

Use a habilidade quando a solicitação combinar uma ou mais das situações abaixo. Ela não deve ser usada para expor chaves de API, publicar arquivos `.env` preenchidos ou tratar a base vetorial como dado público.

| Situação | Resultado esperado da habilidade |
| --- | --- |
| Um agente Streamlit ou Python falha ao consultar um modelo ou ChromaDB. | Diagnóstico do erro, correção configurável e instrução para recriar a base quando embeddings forem incompatíveis. |
| É necessário transformar uma tabela de serviços em aplicativo móvel com orçamento. | Catálogo, detalhes, cálculo de pré-orçamento, conversa segura no servidor e testes. |
| A equipe precisa atualizar a tabela de serviços. | Painel CRUD, definição explícita de persistência e atualização do contexto da conversa. |
| O agente precisa ser preparado para Windows, GitHub e OCI. | Guia local, versionamento seguro, `systemd`, Nginx, HTTPS e checklists de deploy. |

### Como ativar em uma nova solicitação

Ao reutilizar este repositório em um ambiente que suporte habilidades, informe explicitamente o caminho da habilidade e o objetivo. A instrução deve indicar os arquivos de entrada e a entrega desejada.

```text
Use a skill skills/rag-service-agent-mobile-oci para analisar app.py,
ingest_data.py, requirements.txt, README.md e a tabela de preços anexada.
Corrija o erro do agente, preserve o RAG e gere um aplicativo móvel com
catálogo, pré-orçamento e painel de atualização de serviços.
```

Para uma tarefa restrita à implantação, reduza o pedido e informe a arquitetura existente:

```text
Use a skill skills/rag-service-agent-mobile-oci para preparar a publicação
do agente Streamlit em uma Compute OCI. O código já usa ChromaDB local e
deve permanecer privado no GitHub. Gere os arquivos systemd e Nginx a partir
dos modelos e inclua um checklist de validação.
```

### Configuração do agente e dos dados

A habilidade exige que dados sensíveis sejam mantidos fora do código e da própria skill. Crie um `.env` baseado em `.env.example` no ambiente de execução e mantenha as configurações de embedding alinhadas entre o aplicativo e a ingestão.

```dotenv
GOOGLE_API_KEY=sua_chave_privada
GEMINI_MODEL=gemini-3.6-flash
CHROMA_DIR=./chroma_db
CHROMA_COLLECTION=nrv_informatica
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
RAG_TOP_K=4
```

Depois de mudar `EMBEDDING_MODEL` ou `EMBEDDING_DIMENSION`, recrie a base com `python ingest_data.py`. Se somente o prompt ou a interface forem alterados, não é necessário reprocessar a base vetorial. Antes de um commit, execute `git check-ignore -v .env` e confirme que `.env`, `chroma_db/`, `.venv/`, logs e chaves não serão enviados ao repositório.

### Uso dos modelos de implantação

Copie os modelos para os caminhos do sistema somente depois de substituir os valores do ambiente. O serviço executa o Streamlit em `127.0.0.1:8501`, enquanto o Nginx recebe o tráfego público em 80/443. Dessa forma, a porta interna do Streamlit não precisa ser liberada na OCI.

```bash
# Ajuste o conteúdo dos modelos antes de executar estes comandos.
sudo cp skills/rag-service-agent-mobile-oci/templates/streamlit-agent.service.tpl \
  /etc/systemd/system/nrv-ai-agent.service
sudo cp skills/rag-service-agent-mobile-oci/templates/nginx-streamlit.conf.tpl \
  /etc/nginx/sites-available/nrv-ai-agent

sudo systemctl daemon-reload
sudo systemctl enable --now nrv-ai-agent
sudo nginx -t
sudo systemctl reload nginx
```

> Os modelos são pontos de partida, não arquivos prontos para produção. Revise `User`, `WorkingDirectory`, `EnvironmentFile`, `ExecStart`, `server_name` e domínio antes de ativá-los.

### Validação e manutenção

Depois de usar a habilidade, execute a verificação de tipos e os testes disponíveis, valide uma pergunta coberta e outra fora da tabela, e confirme que a resposta não inventa preço ou diagnóstico. Em OCI, acompanhe os logs com `sudo journalctl -u nrv-ai-agent -f`, valide o Nginx com `sudo nginx -t` e teste a saúde interna com `curl -fsS http://127.0.0.1:8501/_stcore/health`.

Para distribuir a habilidade em outro projeto, copie **todo** o diretório `skills/rag-service-agent-mobile-oci/`, não apenas o `SKILL.md`; os modelos e a referência de OCI fazem parte do pacote. Ao publicar uma versão web multiusuário, substitua o armazenamento local do painel administrativo por persistência no servidor e adicione autenticação antes de disponibilizá-lo à equipe.

### Teste isolado de atualização e restauração do ChromaDB

O script `scripts/test_chromadb_lifecycle.py` exercita o ciclo de backup, atualização em estágio e restauração dentro de um diretório temporário. Sem argumentos, ele usa uma estrutura de teste mínima. Com `--source`, ele copia a base indicada, executa todos os passos exclusivamente sobre cópias temporárias e confirma por assinatura de conteúdo que a origem permaneceu inalterada.

```bash
# Teste com estrutura temporária controlada.
python3 scripts/test_chromadb_lifecycle.py

# Teste seguro do processo usando uma cópia da base real na OCI.
python3 scripts/test_chromadb_lifecycle.py --source /opt/nrv-ai-agent/chroma_db

# Execução pela suíte automática do projeto.
pnpm exec vitest run tests/chromadb-lifecycle.test.ts
```

| Validação | Resultado esperado |
| --- | --- |
| Backup | A cópia de backup possui a mesma assinatura da base antes da atualização. |
| Atualização | A base ativa de teste recebe um marcador de atualização, comprovando que a etapa ocorreu no estágio. |
| Restauração | A assinatura da base restaurada coincide exatamente com a do backup. |
| Isolamento | Quando `--source` é usado, a assinatura da origem real permanece igual antes e depois do teste. |

### Backup automatizado do ChromaDB para OCI

O projeto inclui `scripts/backup_chromadb_oci.py`, que gera um arquivo `.tar.gz` e um manifesto SHA-256, envia ambos ao Object Storage da OCI usando a identidade da própria instância e só então aplica a retenção. O envio usa `oci os object put` com `--verify-checksum`; a referência da OCI indica que a opção verifica a soma de verificação do objeto enviado. [3]

| Estratégia | Proteção | Interrupção | Quando aplicar |
| --- | --- | --- | --- |
| Backup consistente do ChromaDB para Object Storage | Arquivo e manifesto verificados, retenção remota e cópias locais recentes. | Breve pausa do Streamlit durante a cópia. | Recomendado para preservar uma base RAG recuperável. |
| Backup de volume da Compute | Imagem ampla da máquina virtual. | Normalmente nenhuma ação na aplicação. | Complemento de recuperação de desastre, não substitui a validação da base. |

Na OCI, use o primeiro caminho para a cópia recuperável da base e mantenha o segundo como camada complementar. Crie um bucket privado, configure uma dynamic group para a instância e conceda a ela somente a permissão necessária de objetos no bucket. O script não usa chave OCI em arquivo: o ambiente esperado é a autenticação `instance_principal` da CLI.

Crie `/etc/nrv-ai-agent/chromadb-backup.env` com permissões restritas e sem nenhum segredo de usuário:

```dotenv
OCI_NAMESPACE=seu_namespace_oci
OCI_BUCKET=nrv-ai-agent-backups
OCI_PREFIX=nrv-ai-agent/chromadb
OCI_RETENTION_COUNT=14
LOCAL_RETENTION_COUNT=2
```

Copie os modelos, valide e habilite o timer. O serviço pausa o agente, executa o backup e usa `ExecStopPost` para iniciá-lo novamente mesmo após uma falha de backup.

```bash
sudo install -m 0644 templates/nrv-chromadb-backup.service.tpl /etc/systemd/system/nrv-chromadb-backup.service
sudo install -m 0644 templates/nrv-chromadb-backup.timer.tpl /etc/systemd/system/nrv-chromadb-backup.timer
sudo chmod 600 /etc/nrv-ai-agent/chromadb-backup.env
sudo systemctl daemon-reload
sudo systemctl enable --now nrv-chromadb-backup.timer
systemctl list-timers nrv-chromadb-backup.timer
sudo systemctl start nrv-chromadb-backup.service
sudo journalctl -u nrv-chromadb-backup.service -n 100 --no-pager
```

Antes de programar o timer, valide o mecanismo local sem contato com a OCI:

```bash
python3 scripts/backup_chromadb_oci.py --fixture --dry-run
pnpm exec vitest run tests/chromadb-oci-backup.test.ts
```

Para restaurar, baixe **o arquivo e o manifesto** para uma área de estágio, confirme o SHA-256, extraia para um diretório novo e valide o resultado com `scripts/test_chromadb_lifecycle.py --source /caminho/para/base-restaurada`. Somente após a validação, pare o serviço e troque a base ativa por uma operação de renomeação atômica.

### Exemplos completos de entrada e saída

Os exemplos abaixo mostram o nível de detalhe esperado ao acionar a habilidade. Os valores sensíveis foram propositalmente substituídos por marcadores. Nunca inclua uma chave de API real, senha ou arquivo `.env` preenchido na entrada.

#### Exemplo 1 — Diagnóstico e correção de agente RAG

**Entrada para a skill**

```text
Use a skill skills/rag-service-agent-mobile-oci.

Arquivos disponíveis:
- app.py
- ingest_data.py
- requirements.txt
- README.md
- Tabela_Servicos.xlsx

Problema: o Streamlit inicia normalmente, mas ao enviar a primeira mensagem
ocorre erro 404 informando que o modelo gemini-2.5-flash não está disponível.

Objetivo: identificar a causa, corrigir o código sem expor a chave da API,
preservar a recuperação no ChromaDB e entregar instruções de teste no Windows.
```

**Saída esperada da skill**

```text
Diagnóstico: a falha ocorre na chamada ao modelo conversacional configurado
como gemini-2.5-flash; ela não é causada pelo retriever ou pelos documentos.

Entregas:
1. app_corrigido.py com GEMINI_MODEL lido do .env e valor padrão compatível;
2. .env.example sem segredo, com GOOGLE_API_KEY, CHROMA_DIR e embeddings;
3. requirements_corrigido.txt com os módulos efetivamente importados;
4. instrução para executar ingest_data.py quando o embedding ou a dimensão
   forem alterados;
5. comandos PowerShell para criar .venv, instalar dependências, ingerir dados
   e iniciar streamlit run app.py.

Critérios de aceitação:
- uma pergunta coberta retorna um pré-orçamento baseado na tabela;
- uma pergunta fora da base solicita análise técnica;
- erros de modelo e configuração geram mensagem clara, sem expor a chave.
```

#### Exemplo 2 — Aplicativo móvel com catálogo e painel administrativo

**Entrada para a skill**

```text
Use a skill skills/rag-service-agent-mobile-oci para transformar a tabela
Tabela_Servicos.xlsx em um aplicativo móvel de atendimento técnico.

Requisitos:
- catálogo pesquisável com preço, prazo e categoria;
- pré-orçamento com itens, quantidade e compartilhamento;
- conversa que use somente o catálogo como contexto;
- painel administrativo simples para cadastrar, editar e remover serviços;
- sem expor chaves do modelo no celular.

Persistência inicial: a tabela pode ser local no dispositivo. Informe qualquer
limitação de sincronização entre aparelhos.
```

**Saída esperada da skill**

```text
Arquitetura entregue:
- telas Início, Serviços, Orçamento, Detalhe do serviço e Administração;
- modelo de serviço com identificador, nome, categoria, preço, prazo e nota;
- armazenamento local para alterações do administrador;
- cálculo determinístico de subtotal e total do pré-orçamento;
- endpoint de conversa no servidor, recebendo o catálogo atual como contexto;
- testes para cálculo, CRUD local e respostas sem alucinação de preço.

Comportamento validado:
1. o administrador altera o preço de um serviço;
2. o catálogo apresenta o novo valor no mesmo dispositivo;
3. novos orçamentos usam o valor atualizado;
4. o assistente recebe a tabela atualizada no próximo atendimento.

Limitação declarada: alterações locais não sincronizam entre dispositivos até
que o catálogo seja migrado para banco de dados e protegido por autenticação.
```

#### Exemplo 3 — Preparação de publicação do agente na OCI

**Entrada para a skill**

```text
Use a skill skills/rag-service-agent-mobile-oci para preparar o deploy de um
agente Streamlit na OCI Compute.

Contexto:
- sistema: Ubuntu 24.04;
- usuário Linux: ubuntu;
- código em /opt/nrv-ai-agent;
- app Streamlit: app.py;
- domínio: agente.exemplo.com;
- o repositório é privado no GitHub;
- a chave Google será criada manualmente em /opt/nrv-ai-agent/.env.

Entregue configuração de systemd e Nginx, comandos de instalação, HTTPS e um
checklist de pré e pós-deploy. Não publique ou solicite a chave da API.
```

**Saída esperada da skill**

```text
Arquivos gerados a partir dos modelos:

/etc/systemd/system/nrv-ai-agent.service
  User=ubuntu
  WorkingDirectory=/opt/nrv-ai-agent
  EnvironmentFile=/opt/nrv-ai-agent/.env
  ExecStart=/opt/nrv-ai-agent/.venv/bin/streamlit run app.py
            --server.address 127.0.0.1 --server.port 8501
  Restart=on-failure

/etc/nginx/sites-available/nrv-ai-agent
  server_name agente.exemplo.com
  proxy_pass http://127.0.0.1:8501
  cabeçalhos de WebSocket, timeouts e proxy_buffering configurados

Validações de saída:
- NSG permite 22 apenas ao IP administrativo e 80/443 ao público;
- 8501 não possui regra pública;
- systemctl is-active nrv-ai-agent retorna active;
- curl -fsS http://127.0.0.1:8501/_stcore/health responde sem erro;
- nginx -t é válido;
- o domínio responde por HTTPS após certbot;
- journalctl não mostra erro recorrente de chave, modelo ou ChromaDB.
```

#### Exemplo 4 — Atualização segura de uma tabela já publicada

**Entrada para a skill**

```text
Use a skill skills/rag-service-agent-mobile-oci.

Atualizamos preços e prazos em Tabela_Servicos.xlsx. O agente já está
publicado em OCI com ChromaDB local e serviço systemd nrv-ai-agent.

Objetivo: atualizar a base sem derrubar o serviço por mais do que o necessário
e descrever como validar que o novo preço está sendo usado.
```

**Saída esperada da skill**

```text
Procedimento seguro:
1. fazer cópia de segurança da planilha anterior e do diretório chroma_db;
2. substituir a planilha validada no diretório do projeto;
3. executar .venv/bin/python ingest_data.py;
4. reiniciar apenas o serviço: sudo systemctl restart nrv-ai-agent;
5. conferir status, health interno e logs;
6. perguntar ao agente sobre um serviço cujo preço mudou;
7. registrar o resultado no checklist pós-deploy.

Resultado esperado: a resposta apresenta o novo preço como pré-orçamento,
mantém o aviso de avaliação técnica e não revela detalhes internos da VM.
```

## Referências

[1] [Oracle Cloud Infrastructure — Creating an Instance](https://docs.oracle.com/iaas/Content/Compute/Tasks/launchinginstance.htm)

[2] [Oracle Cloud Infrastructure — Security Lists](https://docs.oracle.com/iaas/Content/Network/Concepts/securitylists.htm)

[3] [Oracle Cloud Infrastructure CLI — object put](https://docs.oracle.com/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/os/object/put.html)

[4] [Streamlit Community Cloud — App dependencies](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies)

[5] [Streamlit Community Cloud — Secrets management](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/secrets-management)
