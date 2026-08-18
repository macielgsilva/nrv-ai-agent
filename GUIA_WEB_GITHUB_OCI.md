# Guia de publicação: web, GitHub e Oracle Cloud Infrastructure

Este guia separa os dois projetos presentes neste trabalho. O **agente Python/Streamlit** é o caminho que reproduz exatamente a arquitetura do README original e é o recomendado para a primeira publicação em OCI. O **NRV Assistente móvel** pode gerar uma interface web, mas a sua camada de IA atual usa um serviço gerenciado da plataforma de desenvolvimento; antes de hospedá-lo fora dela, essa chamada precisa ser migrada para uma API de LLM própria no servidor.

| Cenário | Use quando | Processo recomendado |
| --- | --- | --- |
| Agente do README | Você quer publicar o agente RAG com ChromaDB, Streamlit e Gemini, como descrito no README. | Siga as Seções 1, 2 e 3. |
| NRV Assistente (Expo web) | Você quer publicar a interface de catálogo, orçamento e painel administrativo criada neste projeto. | Siga a Seção 4 após concluir a migração da IA. |

> **Regra de segurança:** nunca faça commit de `.env`, chaves de API, tokens, banco Chroma ou credenciais. O GitHub alerta explicitamente para não enviar senhas ou chaves a repositórios remotos. [1]

## 1. Preparar uma versão web do agente do README

### 1.1. Ajustar os arquivos locais

Crie uma cópia de trabalho do agente Python. Neste projeto, os arquivos corrigidos estão em `app_corrigido.py`, `requirements_corrigido.txt` e `.env.example`. No repositório que será publicado, eles devem assumir os nomes que o runtime espera:

```bash
cp app_corrigido.py app.py
cp requirements_corrigido.txt requirements.txt
cp .env.example .env
```

Edite `.env` e preencha **somente na máquina local ou na VM OCI**:

```dotenv
GOOGLE_API_KEY=sua_chave_google_aqui
GEMINI_MODEL=gemini-3.6-flash
CHROMA_DIR=./chroma_db
CHROMA_COLLECTION=nrv_informatica
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
RAG_TOP_K=4
```

O código corrigido elimina a referência ao modelo indisponível `gemini-2.5-flash`, preserva a recuperação no ChromaDB e fornece mensagens claras se a base ainda não foi gerada. Sempre que o modelo de embedding ou a dimensão forem alterados, apague a base anterior e execute novamente a ingestão para manter os vetores consistentes.

### 1.2. Executar e validar localmente

Em Linux ou macOS, execute os comandos abaixo a partir da raiz do agente.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python ingest_data.py
streamlit run app.py
```

Abra `http://localhost:8501` e faça pelo menos duas perguntas que estejam na planilha. Confirme que o preço retornado coincide com a tabela e que a mensagem de contingência aparece de modo compreensível se a chave for removida temporariamente.

### 1.2.1. Executar e validar no Windows

Abra o **PowerShell** na raiz do projeto e confirme que o Python 3.10 ou superior está disponível. Os comandos abaixo criam um ambiente isolado, instalam as dependências, geram a base RAG e iniciam o Streamlit.

```powershell
py --version
py -3.10 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
python ingest_data.py
streamlit run app.py --server.runOnSave true
```

No arquivo `.env` aberto pelo Bloco de Notas, preencha `GOOGLE_API_KEY` com a sua chave e mantenha `GEMINI_MODEL=gemini-3.6-flash`. Não adicione esse arquivo ao Git. Se o PowerShell informar que scripts estão bloqueados, execute novamente `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`; a mudança vale somente para a janela atual e não altera a política global do computador.

Abra `http://localhost:8501` no navegador. Teste primeiro uma pergunta com dados objetivos da planilha, como **“Quanto custa formatar o Windows e fazer backup de 200 GB?”**, e verifique o valor, o prazo e o aviso de pré-orçamento. Depois, teste um sintoma não coberto para confirmar que o agente solicita análise técnica em vez de inventar uma resposta.

| Situação no Windows | Ação recomendada |
| --- | --- |
| `py -3.10` não é reconhecido | Instale o Python 3.10+ e marque a opção para adicioná-lo ao `PATH`; em seguida, reabra o PowerShell. |
| `streamlit` não é reconhecido | Confirme que `(.venv)` aparece no início da linha; como alternativa, rode `python -m streamlit run app.py`. |
| Erro de chave ou de modelo | Confira `GOOGLE_API_KEY` e `GEMINI_MODEL` no `.env`, salve o arquivo e reinicie o Streamlit. |
| Base vazia ou erro de embedding | Execute `python ingest_data.py` novamente após revisar o `.env`. |
| Porta 8501 ocupada | Execute `streamlit run app.py --server.port 8502` e abra `http://localhost:8502`. |

Para encerrar o servidor local, retorne ao PowerShell e pressione `Ctrl+C`. Para sair do ambiente virtual, execute `deactivate`.

### 1.3. Arquivos que devem e não devem ir ao repositório

Mantenha no Git o código, `README.md`, `requirements.txt`, `ingest_data.py`, os documentos e a planilha usados como fonte. Não versiona `.env`, `.venv/`, `__pycache__/`, `chroma_db/`, logs ou arquivos temporários. Inclua estas regras antes do primeiro commit:

```gitignore
# Segredos e runtime local
.env
.venv/
__pycache__/
chroma_db/
*.log
```

O repositório atual do aplicativo também precisa ignorar `.env`: o `.gitignore` existente já ignora artefatos de build, mas não um arquivo `.env` simples. Se ele já foi adicionado ao índice, remova apenas o rastreamento, sem apagar o arquivo local:

```bash
git rm --cached .env
```

## 2. Adicionar o projeto ao GitHub

### 2.1. Criar e revisar o repositório local

Entre na pasta correta e rode os comandos abaixo. Se ela já for um repositório Git, não execute novamente `git init`.

```bash
cd /caminho/para/nrv-ai-agent
git init -b main
git status
git check-ignore -v .env
git add .
git status
git commit -m "feat: agente NRV com RAG e configuração corrigida"
```

Revise a saída de `git status` antes de confirmar. Ela não deve conter `.env`, arquivos de chave (`*.pem`, `*.key`), diretórios de dependências ou o banco Chroma.

### 2.2. Publicar com GitHub CLI

Autentique a CLI no seu próprio computador e crie um repositório privado. O GitHub documenta `gh repo create --source=. --private --push` como forma de criar o repositório remoto, configurar a origem e enviar a branch atual. [1]

```bash
gh auth login
gh repo create nrv-ai-agent --private --source=. --remote=origin --push
```

Para um repositório público, troque `--private` por `--public` **somente após** confirmar que não há dados internos, senhas ou informações de clientes nos arquivos.

### 2.3. Alternativa pelo site do GitHub

No GitHub, selecione **New repository**, defina o nome `nrv-ai-agent` e não inicialize o repositório com README, `.gitignore` ou licença. Em seguida, copie a URL exibida em *Quick setup* e execute:

```bash
git remote add origin https://github.com/SEU_USUARIO/nrv-ai-agent.git
git remote -v
git push -u origin main
```

Se já existir uma origem chamada `origin`, descubra a URL com `git remote -v`. Renomeie a origem anterior ou substitua a URL em vez de adicionar uma segunda origem com o mesmo nome.

```bash
git remote rename origin origem-anterior
git remote add origin https://github.com/SEU_USUARIO/nrv-ai-agent.git
git push -u origin main
```

## 3. Publicar o agente Python na Oracle Cloud Infrastructure

### 3.1. Criar a máquina virtual

No Console OCI, abra **Compute → Instances → Create instance**. A Oracle recomenda criar uma VCN com conectividade de internet para um primeiro ambiente e requer uma chave pública SSH no formato OpenSSH para acessar instâncias Linux. [2]

Escolha uma imagem Ubuntu LTS, uma shape compatível com sua conta e um boot volume com espaço suficiente para o ambiente Python, documentos e ChromaDB. Configure uma subnet pública com IP público. Salve com cuidado a chave privada SSH no seu computador; ela não deve ser enviada ao GitHub.

Na Network Security Group (preferível) ou Security List da subnet, libere apenas as regras necessárias. Security Lists e NSGs funcionam como firewalls virtuais para as instâncias de Compute. [3]

| Regra de entrada | Origem | Porta de destino | Finalidade |
| --- | --- | --- | --- |
| TCP | Seu IP público `/32` | 22 | Administração por SSH. |
| TCP | `0.0.0.0/0` | 80 | Redirecionamento HTTP e validação de certificado. |
| TCP | `0.0.0.0/0` | 443 | Acesso público HTTPS. |

Não exponha a porta `8501` publicamente. O Streamlit ficará ligado apenas a `127.0.0.1` e o Nginx será o único processo acessível externamente.

### 3.2. Conectar e instalar os pacotes básicos

Substitua `IP_PUBLICO` pelo IP da instância e ajuste o caminho da chave privada.

```bash
chmod 600 ~/Downloads/oci-nrv.key
ssh -i ~/Downloads/oci-nrv.key ubuntu@IP_PUBLICO

sudo apt update
sudo apt install -y git nginx python3-venv python3-pip certbot python3-certbot-nginx
```

Clone seu repositório. Para um repositório privado, configure uma chave de implantação de leitura ou autentique o GitHub CLI na VM; não use senha de conta em um comando ou arquivo de texto.

```bash
sudo mkdir -p /opt/nrv-ai-agent
sudo chown "$USER":"$USER" /opt/nrv-ai-agent
git clone https://github.com/SEU_USUARIO/nrv-ai-agent.git /opt/nrv-ai-agent
cd /opt/nrv-ai-agent
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

Crie o arquivo de ambiente diretamente na VM e restrinja as permissões.

```bash
umask 077
nano .env
chmod 600 .env
```

Cole as variáveis da Seção 1.1, salve, execute a ingestão e faça um teste local.

```bash
.venv/bin/python ingest_data.py
.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501
```

Em outra sessão SSH, valide a resposta e então encerre o teste com `Ctrl+C`:

```bash
curl -I http://127.0.0.1:8501
```

### 3.3. Criar o serviço permanente

Crie `/etc/systemd/system/nrv-ai-agent.service` com este conteúdo. Ajuste `User=` caso a VM use outro usuário.

```ini
[Unit]
Description=NRV AI Agent Streamlit
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/nrv-ai-agent
EnvironmentFile=/opt/nrv-ai-agent/.env
ExecStart=/opt/nrv-ai-agent/.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ative o serviço e acompanhe os logs.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nrv-ai-agent
sudo systemctl status nrv-ai-agent --no-pager
sudo journalctl -u nrv-ai-agent -f
```

### 3.4. Configurar Nginx e HTTPS

Crie `/etc/nginx/sites-available/nrv-ai-agent`.

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    location / {
        proxy_pass http://127.0.0.1:8501;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Habilite a configuração e valide a sintaxe antes de recarregar o Nginx.

```bash
sudo ln -s /etc/nginx/sites-available/nrv-ai-agent /etc/nginx/sites-enabled/nrv-ai-agent
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Se houver um domínio, crie um registro DNS `A` apontando para o IP público da VM e aguarde a propagação. Depois, emita o certificado:

```bash
sudo certbot --nginx -d app.seudominio.com
sudo systemctl status certbot.timer --no-pager
```

Teste `https://app.seudominio.com`, faça uma pergunta coberta pela tabela e consulte `sudo journalctl -u nrv-ai-agent -n 100 --no-pager` se a resposta falhar. Sempre que atualizar os arquivos de dados, execute novamente `ingest_data.py` e reinicie o serviço com `sudo systemctl restart nrv-ai-agent`.

## 4. Publicar a interface NRV Assistente como web

O projeto móvel usa Expo/React Native Web no cliente e Express/tRPC no servidor. Para produzir uma interface estática web, o comando base é:

```bash
pnpm install --frozen-lockfile
pnpm exec expo export --platform web --output-dir web-build
```

Contudo, **não publique a versão atual diretamente em OCI ainda**. O endpoint `nrv.chat` chama `invokeLLM`, uma integração do ambiente gerenciado atual, que não estará presente em uma VM Oracle. Antes, migre essa função para uma API própria — por exemplo, Google Gemini no servidor — e configure a chave apenas em `/opt/nrv-assistente/.env`. Também adapte o Express para servir `web-build` e responder `index.html` nas rotas do cliente, ou use Nginx para servir os estáticos e encaminhar somente `/api/` ao Node.

Após essa migração, use este fluxo no servidor OCI:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm exec expo export --platform web --output-dir web-build
pnpm build
PORT=3000 NODE_ENV=production pnpm start
```

O Nginx deverá encaminhar a aplicação para `127.0.0.1:3000` e usar as mesmas portas públicas 80/443. Para o callback web de autenticação, defina a URL pública do front-end em `EXPO_WEB_PREVIEW_URL`; sem ela, o callback atual usa `http://localhost:8081` como fallback. O painel administrativo atual mantém a tabela no armazenamento do navegador, portanto cada navegador/dispositivo terá sua própria tabela até que o catálogo seja migrado para banco de dados.

## 5. Checklist de entrega

| Verificação | Como confirmar |
| --- | --- |
| Segredos fora do Git | `git status` não lista `.env`; `git check-ignore -v .env` aponta uma regra. |
| Base RAG pronta | A pasta `chroma_db/` existe na VM após `ingest_data.py`. |
| Serviço ativo | `systemctl is-active nrv-ai-agent` retorna `active`. |
| Proxy válido | `sudo nginx -t` retorna configuração bem-sucedida. |
| HTTPS | O navegador mostra certificado válido no domínio. |
| Agente funcional | Perguntas da tabela retornam preço e prazo como pré-orçamento. |
| Recuperação | Após reiniciar a VM, o serviço e o Nginx voltam automaticamente. |

## Referências

[1] [GitHub Docs — Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

[2] [Oracle Cloud Infrastructure — Creating an Instance](https://docs.oracle.com/iaas/Content/Compute/Tasks/launchinginstance.htm)

[3] [Oracle Cloud Infrastructure — Security Lists](https://docs.oracle.com/iaas/Content/Network/Concepts/securitylists.htm)
