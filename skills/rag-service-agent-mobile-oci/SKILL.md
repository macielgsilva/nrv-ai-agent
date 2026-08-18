---
name: rag-service-agent-mobile-oci
description: Diagnosticar agentes de atendimento baseados em RAG, convertê-los em aplicativos móveis com catálogo e orçamento, e preparar backup verificável, GitHub e OCI. Use quando um usuário fornecer um agente Python ou Streamlit com falhas de LLM/RAG e solicitar correção, aplicativo móvel, painel de serviços, versão web, backup ChromaDB ou publicação na Oracle Cloud Infrastructure.
---

# Agente RAG de Serviços: Móvel e OCI

Use esta habilidade para transformar um agente de atendimento técnico baseado em documentos e tabela de preços em uma solução móvel verificável, sem perder a versão Python original nem expor segredos.

## Escopo e resultado esperado

Entregue apenas os artefatos pedidos: diagnóstico da falha, agente corrigido, aplicativo móvel de catálogo e orçamento, painel de atualização de serviços e documentação de publicação. Declare a seleção adotada quando o pedido for ambíguo.

| Cenário | Entrega mínima |
| --- | --- |
| Erro no agente Python | Causa, arquivo corrigido, dependências completas e `.env.example`. |
| Aplicativo móvel | Catálogo, orçamento, conversa no servidor, testes e identidade visual. |
| Administração simples | CRUD de serviços, persistência explícita e reflexo no catálogo e no contexto da conversa. |
| Publicação | Guia de Windows, GitHub, OCI, checklist pré-deploy e checklist pós-deploy. |
| Atualização da base RAG | Backup verificável, atualização em estágio, restauração e teste sem tocar na origem. |

## 1. Descobrir o sistema original

1. Leia README, arquivo principal, ingestão, dependências, `.gitignore`, logs ou captura do erro e a fonte de preços.
2. Mapeie modelo conversacional, modelo e dimensão de embeddings, diretório e coleção vetorial, origem dos documentos e variáveis de ambiente.
3. Examine o erro real antes de alterar código. Para modelo indisponível, confirme o identificador com documentação oficial do provedor em vez de supor uma versão válida.
4. Compare imports e `requirements.txt`; inclua dependências de carregadores, divisores, banco vetorial, planilha e PDF quando aplicável.
5. Preserve a regra de negócio: preços, prazos e diagnósticos devem surgir exclusivamente das fontes fornecidas; o agente deve declarar incerteza ou solicitar avaliação técnica fora do contexto.

> Mantenha modelo conversacional, modelo de embedding e dimensão configuráveis por ambiente. Se embedding ou dimensão mudar, oriente a reconstrução integral da base vetorial.

## 2. Corrigir o agente RAG Python

1. Centralize configurações em `.env` e forneça `.env.example` sem valores sensíveis.
2. Valide chave de API, diretório persistente e coleção não vazia antes de aceitar mensagens.
3. Converta erros previsíveis em mensagens operacionais: credencial ausente, modelo indisponível, base inexistente, base vazia e incompatibilidade de embeddings.
4. Use temperatura conservadora e prompt que proíba valores, prazos ou diagnósticos inventados.
5. Preserve a mesma configuração de embeddings em `app.py` e `ingest_data.py`.
6. Teste sintaxe do código e uma execução local controlada. Não execute ingestões extensas sem necessidade.

Use `references/oci-streamlit.md` para a matriz de validação local e implantação do Streamlit. Use os modelos em `templates/` somente depois de adaptar nome do serviço, usuário, domínio e caminho do projeto.

## 3. Construir o aplicativo móvel

1. Antes de criar o projeto, leia `automation-and-scheduling`; se houver LLM no backend, leia `builtin-llm-models`. Em aplicativo móvel com backend, leia também a documentação do backend do template.
2. Após iniciar o projeto, crie `design.md` e `todo.md`. Defina telas, fluxos, cores específicas, orientação retrato e uso com uma mão.
3. Modele serviços com identificador estável, categoria, descrição, preço, prazo, observação e campos necessários à cotação.
4. Exiba preço e prazo em catálogo, detalhe e orçamento. Trate o resultado como pré-orçamento sujeito à avaliação.
5. Execute o assistente no servidor; nunca coloque chave do provedor LLM no aplicativo. Injete somente o catálogo controlado como contexto, imponha instruções de não-alucinação e entregue contingência legível se a chamada falhar.
6. Crie ícone exclusivo e atualize recursos de marca exigidos pelo runtime móvel antes do primeiro checkpoint.

## 4. Implementar administração de serviços

Escolha a persistência explicitamente.

| Necessidade | Estratégia |
| --- | --- |
| Protótipo ou operação em um único dispositivo | Persistência local, com aviso de que as alterações não são compartilhadas. |
| Equipe, múltiplos dispositivos ou publicação web | Banco de dados no servidor, autenticação administrativa e controle de acesso. |

Implemente cadastro, edição, exclusão e restauração da tabela padrão. Valide campos obrigatórios, valor numérico não negativo e identificador único. Sempre que o catálogo for alterado, use o estado atualizado no catálogo, no orçamento e no contexto do assistente. Inclua testes determinísticos para criação, edição, exclusão e contexto personalizado do chat.

## 5. Testar atualização e restauração do ChromaDB

Use `scripts/test_chromadb_lifecycle.py` para validar o ciclo de backup, atualização em estágio e restauração sem alterar a base indicada. Sem argumentos, o script usa uma estrutura temporária controlada. Com `--source`, ele copia a base para um diretório temporário, compara assinaturas de conteúdo antes e depois e confirma que a origem permaneceu intacta.

```bash
# Teste do fluxo com estrutura temporária.
python3 scripts/test_chromadb_lifecycle.py

# Teste seguro de uma base existente: a origem não é modificada.
python3 scripts/test_chromadb_lifecycle.py --source /caminho/para/chroma_db
```

Antes de atualizar dados em produção, mantenha uma cópia protegida do banco e das fontes de entrada. Depois da ingestão, valide uma pergunta cujo preço ou prazo mudou, execute o health check local e, se houver divergência, restaure o backup com procedimento explícito em vez de sobrescrever a base ativa sem confirmação.

## 6. Automatizar backup do ChromaDB para OCI

Use `scripts/backup_chromadb_oci.py` quando a base ChromaDB precisar de cópias recorrentes, verificáveis e recuperáveis no OCI Object Storage. O script cria um arquivo compactado e um manifesto SHA-256; só execute retenção remota após o upload do arquivo e do manifesto terem sucesso.

1. Primeiro execute `python3 scripts/backup_chromadb_oci.py --fixture --dry-run`. Use este modo para validar o arquivo, manifesto e assinatura sem base real, credencial ou chamada externa.
2. Mantenha um bucket privado. Dê à instância apenas a política mínima de Object Storage através de dynamic group e instance principal. Nunca armazene arquivo de configuração de chave OCI no projeto ou no `EnvironmentFile`.
3. Ajuste `templates/nrv-chromadb-backup.service.tpl` e `templates/nrv-chromadb-backup.timer.tpl`. Informe diretório real da base, serviço Streamlit, namespace, bucket, prefixo e retenção por meio de `/etc/nrv-ai-agent/chromadb-backup.env` com permissão `600`.
4. O serviço deve interromper brevemente o Streamlit antes da cópia e iniciá-lo com `ExecStopPost` mesmo quando o backup falhar. Não libere a porta 8501; a pausa curta é preferível a uma cópia de arquivos inconsistente.
5. Habilite o timer somente após executar manualmente uma vez, conferir `journalctl -u nrv-chromadb-backup.service` e confirmar que arquivo e manifesto aparecem no bucket.
6. Para restauração, baixe arquivo e manifesto para uma área de estágio, confirme a soma SHA-256, extraia em diretório novo, execute `test_chromadb_lifecycle.py --source` sobre a cópia restaurada e faça uma troca atômica da base ativa apenas depois da validação.

```bash
# Validação isolada: não toca em OCI nem em uma base real.
python3 scripts/backup_chromadb_oci.py --fixture --dry-run

# Teste automatizado associado no projeto consumidor.
pnpm exec vitest run tests/chromadb-oci-backup.test.ts
```

## 7. Validar e revisar

1. Execute verificação de tipos, testes unitários e sintaxe do agente Python.
2. Capture as telas de atendimento, catálogo, orçamento e administração; corrija controles truncados, rotas quebradas e fluxos sem retorno.
3. Teste uma pergunta coberta pela tabela e outra fora da base. Verifique que a segunda não produz preço ou diagnóstico inventado.
4. Antes de cada checkpoint, leia `todo.md` e marque todo item concluído como `[x]`.
5. Em falha de checkpoint por imagens grandes, reduza recursos de launcher sem alterar semanticamente a marca e tente salvar novamente.

## 8. Documentar GitHub, Windows e OCI

Crie documentação de implantação separando dois caminhos: agente Python/Streamlit e versão Expo web. Não declare que uma integração LLM gerenciada do ambiente de desenvolvimento funcionará em uma VM externa; exija a migração para uma API de servidor compatível antes do deploy.

### GitHub

1. Confirme `.env`, chaves, `.venv`, banco vetorial e logs no `.gitignore`.
2. Oriente `git status` e `git check-ignore -v .env` antes de qualquer `git add`.
3. Explique criação de repositório, remote, push e recomendação de repositório privado enquanto a fonte contiver dados internos.

### Windows local

Inclua procedimento em PowerShell para confirmar Python, criar `.venv`, liberar execução somente para a sessão atual, ativar o ambiente, instalar requisitos, configurar `.env`, rodar ingestão e iniciar Streamlit. Descreva como diagnosticar `streamlit` não encontrado, porta ocupada, chave ausente e base vazia.

### OCI para Streamlit

1. Use Compute Linux com SSH, Nginx e portas 80/443; não exponha 8501 ao público.
2. Deixe Streamlit escutando em `127.0.0.1:8501` sob `systemd`.
3. Crie `.env` diretamente na VM com permissões restritas e execute a ingestão no servidor.
4. Configure proxy reverso e HTTPS. Use os arquivos em `templates/` como ponto de partida.
5. Acrescente ao README checklist pré-deploy e pós-deploy: saúde interna, HTTPS público, resposta coberta e descoberta de lacuna, logs, reinicialização e backup do ChromaDB.

## Critérios de entrega

Entregue resumo breve, arquivos corrigidos ou checkpoint conforme o tipo de projeto e limitações relevantes. Declare claramente se o painel usa armazenamento local e se a web externa ainda depende de migração do backend de IA. Nunca anexe segredos, `.env` preenchido ou banco vetorial que contenha informação confidencial.
