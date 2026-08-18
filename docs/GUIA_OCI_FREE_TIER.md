# Roteiro exato: iniciar o pacote NRV na Oracle Cloud Free Tier

## Objetivo e arquitetura

Este roteiro instala a aplicação **Streamlit/RAG** contida em `streamlit-agent/` do arquivo `nrv-informatica-distribuicao.zip`. Ela é o componente preparado para rodar em uma VM OCI: usa Python, ChromaDB local, `systemd` e Nginx. O diretório `mobile-app/` também está no ZIP, mas o aplicativo Expo ainda depende de uma integração de IA do ambiente de desenvolvimento; portanto, **não inicie o mobile-app em OCI antes de migrar o endpoint de IA para uma API própria no servidor**.

> O ZIP de distribuição não inclui `.env`, chaves ou o diretório `chroma_db`. Isso é intencional: a chave é criada somente na VM, e a base vetorial é gerada a partir da planilha e dos documentos de origem.

| Item necessário | Onde obter | Observação |
| --- | --- | --- |
| Conta Oracle Cloud Free Tier | Console OCI | Use a **home region** da tenancy para recursos Always Free. [1] |
| Arquivo `nrv-informatica-distribuicao.zip` | Pacote gerado neste projeto | Mantenha-o no computador que fará o upload. |
| Chave SSH | Computador local | Gere uma chave OpenSSH; guarde a chave privada fora do Git. [2] |
| Domínio (opcional, recomendado) | Provedor DNS | Necessário para HTTPS público com Let's Encrypt. |
| Chave Google Gemini | Google AI Studio | Será colocada manualmente em `.env` na VM, nunca no ZIP ou GitHub. |

## 1. Criar a chave SSH no computador local

No **PowerShell do Windows**, gere uma chave RSA e proteja o arquivo privado. Não envie o arquivo `oci_nrv` ao GitHub, por e-mail ou ao servidor.

```powershell
mkdir $HOME\.ssh -ErrorAction SilentlyContinue
ssh-keygen -t rsa -b 4096 -f "$HOME\.ssh\oci_nrv" -C "oci-nrv"
Get-Content "$HOME\.ssh\oci_nrv.pub"
```

Copie integralmente a última saída, que começa com `ssh-rsa`. Ela será inserida no Console OCI durante a criação da instância.

## 2. Criar uma instância Always Free no Console OCI

No Console OCI, abra **Compute → Instances → Create instance**. Dê o nome `nrv-ai-agent` e selecione seu compartment. Caso ainda não exista uma rede, use **Create new virtual cloud network** e escolha a opção com conectividade à internet. A Oracle recomenda esse fluxo para criar simultaneamente a VCN, sub-redes, gateway e rotas básicas. [2]

Na seção de imagem, escolha **Ubuntu 24.04** que esteja identificada como **Always Free Eligible**. Em **Shape**, prefira `VM.Standard.A1.Flex` e configure inicialmente **1 OCPU e 6 GB de memória**. A cota Always Free do A1 equivale, no total da tenancy, a até 2 OCPUs e 12 GB de memória; uma única instância com 1 OCPU/6 GB deixa margem para expansão ou uma segunda VM. [1]

Na seção de rede, escolha uma **public subnet** e marque **Assign a public IPv4 address**. Na seção SSH, selecione *Paste public keys* e cole o conteúdo de `oci_nrv.pub`. Em boot volume, mantenha 50 GB inicialmente. Crie a instância e aguarde o estado **Running**. Anote o **Public IPv4 address**.

> Se ocorrer `Out of host capacity`, não altere para uma shape paga. A Oracle informa que a capacidade Always Free pode estar temporariamente indisponível; tente outra availability domain ou tente novamente mais tarde. [1]

## 3. Liberar apenas as portas necessárias

Na página da instância, abra a VNIC e o **Network Security Group**. Se não houver um NSG, crie um e associe-o à VNIC. A Oracle recomenda NSGs em vez de Security Lists quando possível; ambos funcionam como firewall virtual. [3]

Crie as regras de **ingress stateful** abaixo. Substitua `SEU_IP_PUBLICO` pelo IP público da rede de onde você administrará a VM, disponível em sites de consulta de IP ou no seu roteador.

| Protocolo | Origem | Porta de destino | Finalidade |
| --- | --- | --- | --- |
| TCP | `SEU_IP_PUBLICO/32` | 22 | SSH administrativo. |
| TCP | `0.0.0.0/0` | 80 | HTTP e validação inicial do certificado. |
| TCP | `0.0.0.0/0` | 443 | Aplicação pública em HTTPS. |

**Não crie regra para a porta 8501.** O Streamlit ficará ligado apenas a `127.0.0.1`; o Nginx receberá o tráfego externo e o encaminhará internamente.

## 4. Enviar o ZIP e acessar a VM

No computador que contém o pacote, execute no PowerShell. Substitua `IP_DA_OCI` pelo IPv4 público mostrado no Console.

```powershell
scp -i "$HOME\.ssh\oci_nrv" `
  "$HOME\Downloads\nrv-informatica-distribuicao.zip" `
  ubuntu@IP_DA_OCI:/home/ubuntu/

ssh -i "$HOME\.ssh\oci_nrv" ubuntu@IP_DA_OCI
```

Se você colocou o ZIP em outro diretório, altere somente o primeiro caminho. O primeiro acesso pode pedir confirmação da impressão digital do servidor; confira o IP e responda `yes`.

## 5. Instalar os pacotes e extrair a aplicação

Todos os comandos desta seção são executados **dentro da VM OCI**, depois do SSH.

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip unzip nginx certbot python3-certbot-nginx

sudo mkdir -p /opt/nrv
sudo chown ubuntu:ubuntu /opt/nrv
unzip ~/nrv-informatica-distribuicao.zip -d /opt/nrv

cd /opt/nrv/nrv-informatica-distribuicao/streamlit-agent
ls -la
```

Confirme que aparecem `app.py`, `ingest_data.py`, `requirements.txt`, `Tabela_Servicos_NRV.xlsx`, `scripts/` e `templates/`. Não use `sudo pip`; o ambiente virtual abaixo mantém as dependências isoladas.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

## 6. Criar o arquivo `.env` somente na VM

Crie o arquivo com permissão restrita. Substitua somente `COLE_SUA_CHAVE_AQUI` pela chave Google real.

```bash
umask 077
cat > .env <<'EOF'
GOOGLE_API_KEY=COLE_SUA_CHAVE_AQUI
GEMINI_MODEL=gemini-3.6-flash
CHROMA_DIR=./chroma_db
CHROMA_COLLECTION=nrv_informatica
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
RAG_TOP_K=4
EOF
chmod 600 .env
```

Verifique apenas se a chave foi definida, sem imprimi-la:

```bash
test -s .env && echo ".env criado com sucesso"
git status --ignored 2>/dev/null || true
```

## 7. Gerar a base RAG e testar localmente na VM

Execute a ingestão uma única vez para criar o ChromaDB a partir da tabela e dos documentos incluídos. Em seguida, rode o Streamlit temporariamente somente no loopback.

```bash
.venv/bin/python ingest_data.py
.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true
```

Em uma **segunda** sessão SSH, confirme que o processo responde:

```bash
curl -fsS http://127.0.0.1:8501/_stcore/health
```

O comando deve finalizar sem erro. Volte à primeira sessão e pressione `Ctrl+C` para encerrar o teste temporário.

## 8. Criar o serviço persistente systemd

Crie o serviço exatamente com o conteúdo abaixo. O `Restart=on-failure` mantém a aplicação disponível se o processo falhar; `EnvironmentFile` carrega a chave sem colocá-la no unit file.

```bash
sudo tee /etc/systemd/system/nrv-ai-agent.service > /dev/null <<'EOF'
[Unit]
Description=NRV AI Agent Streamlit
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/nrv/nrv-informatica-distribuicao/streamlit-agent
EnvironmentFile=/opt/nrv/nrv-informatica-distribuicao/streamlit-agent/.env
ExecStart=/opt/nrv/nrv-informatica-distribuicao/streamlit-agent/.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now nrv-ai-agent
sudo systemctl status nrv-ai-agent --no-pager
curl -fsS http://127.0.0.1:8501/_stcore/health
```

Se o serviço falhar, consulte os logs antes de alterar qualquer variável:

```bash
sudo journalctl -u nrv-ai-agent -n 100 --no-pager
```

## 9. Configurar o Nginx como proxy reverso

Para um teste sem domínio, substitua `SEU_DOMINIO_OU_IP` pelo IPv4 público. Para produção, use o domínio que receberá o registro DNS `A`.

```bash
sudo tee /etc/nginx/sites-available/nrv-ai-agent > /dev/null <<'EOF'
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
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/nrv-ai-agent /etc/nginx/sites-enabled/nrv-ai-agent
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Abra `http://IP_DA_OCI` no navegador. A página inicial do Streamlit deve carregar. Faça uma pergunta que conste na tabela de serviços e outra fora da base para confirmar que o agente não inventa valores.

## 10. Configurar DNS e HTTPS

Se você possuir o domínio `agente.seudominio.com`, crie um registro DNS **A** apontando para `IP_DA_OCI`. Aguarde a propagação e confirme:

```bash
getent hosts agente.seudominio.com
```

Quando a saída trouxer o IP público correto, edite a configuração do Nginx e substitua `SEU_DOMINIO_OU_IP` pelo domínio. Depois emita o certificado:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d agente.seudominio.com
sudo systemctl status certbot.timer --no-pager
```

Teste no navegador `https://agente.seudominio.com`. Sem domínio, o serviço pode ser usado por HTTP no IP público, mas não haverá certificado HTTPS válido.

## 11. Usar GitHub depois do primeiro funcionamento

O caminho principal para o pacote é `SCP + unzip`. **Clone** é a alternativa depois de enviar o conteúdo ao GitHub. Na VM, substitua a instalação via ZIP por:

```bash
sudo rm -rf /opt/nrv/nrv-informatica-distribuicao
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git /opt/nrv/nrv-informatica-distribuicao
cd /opt/nrv/nrv-informatica-distribuicao/streamlit-agent
```

Para repositório privado, prefira uma chave de implantação de leitura ou token limitado configurado no gerenciador de credenciais. Não cole token dentro da URL do repositório, no arquivo de serviço ou no `.env` da aplicação.

## 12. Ativar backup de OCI somente após validar o agente

O pacote inclui `scripts/backup_chromadb_oci.py` e modelos de `systemd` timer. Antes de integrá-los a Object Storage, valide o modo seguro e isolado:

```bash
cd /opt/nrv/nrv-informatica-distribuicao/streamlit-agent
.venv/bin/python scripts/backup_chromadb_oci.py --fixture --dry-run
```

Depois crie um bucket privado, uma dynamic group para a instância e uma política IAM mínima para gravar objetos naquele bucket. Configure os modelos em `templates/nrv-chromadb-backup.service.tpl` e `templates/nrv-chromadb-backup.timer.tpl` com namespace, bucket, prefixo, retenção e diretório da base. Só habilite o timer depois de verificar que tanto o arquivo quanto o manifesto SHA-256 aparecem no Object Storage.

## 13. Checklist final

| Verificação | Comando ou resultado esperado |
| --- | --- |
| Serviço ativo | `systemctl is-active nrv-ai-agent` retorna `active`. |
| Saúde interna | `curl -fsS http://127.0.0.1:8501/_stcore/health` não falha. |
| Proxy válido | `sudo nginx -t` retorna sucesso. |
| HTTP/HTTPS público | O navegador abre o IP ou domínio; com domínio, o certificado é válido. |
| Regra de segurança | NSG não tem porta pública 8501 e SSH está limitado ao seu IP. |
| RAG pronto | `chroma_db/` existe e perguntas cobertas retornam pré-orçamentos compatíveis com a tabela. |
| Reinício automático | `sudo reboot`, novo SSH e `systemctl is-active nrv-ai-agent` retornam a aplicação ativa. |

Em contas Always Free, instâncias ociosas podem ser recuperadas pela Oracle sob critérios de utilização durante sete dias. Não use carga artificial para contornar esse mecanismo; mantenha backup, monitore a instância e preserve um procedimento de recriação documentado. [1]

## Referências

[1] [Oracle Cloud Infrastructure — Always Free Resources](https://docs.oracle.com/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

[2] [Oracle Cloud Infrastructure — Creating an Instance](https://docs.oracle.com/iaas/Content/Compute/Tasks/launchinginstance.htm)

[3] [Oracle Cloud Infrastructure — Security Lists](https://docs.oracle.com/iaas/Content/Network/Concepts/securitylists.htm)
