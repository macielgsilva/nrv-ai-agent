# Guia operacional: Streamlit persistente com systemd e Nginx na OCI

Este procedimento instala o agente Streamlit em uma instância Linux da Oracle Cloud Infrastructure (OCI), mantém o processo ativo com `systemd` e publica somente o Nginx para a internet. A arquitetura evita expor a porta interna do Streamlit e permite recuperar automaticamente o serviço após falha ou reinicialização.

```text
Internet ── HTTPS :443 ── Nginx ── HTTP 127.0.0.1:8501 ── Streamlit / systemd
```

> Uma unidade `.service` é supervisionada pelo systemd; `Type=exec` faz o gerenciador aguardar a execução efetiva do binário, e `Restart=on-failure` permite reiniciar o processo se ele falhar. [1]

## 1. Premissas e valores a substituir

Este guia usa os valores abaixo. Substitua-os de forma consistente antes de executar os comandos.

| Variável | Exemplo | Finalidade |
| --- | --- | --- |
| `USUARIO` | `ubuntu` | Usuário Linux que executa o processo. |
| `PROJETO` | `nrv-ai-agent` | Nome da pasta e do serviço. |
| `DIRETORIO` | `/opt/nrv-ai-agent` | Local do código na VM. |
| `DOMINIO` | `agente.seudominio.com` | Nome DNS público da aplicação. |
| `APP` | `app.py` | Arquivo Streamlit principal. |

Os comandos assumem Ubuntu ou outra distribuição baseada em `apt`, acesso SSH funcional e um repositório Git já preparado sem `.env` nem chaves de API.

## 2. Configurar rede e regras na OCI

Associe uma **Network Security Group (NSG)** à VNIC da instância. A OCI descreve NSGs como firewalls virtuais que aplicam regras de entrada e saída a VNICs selecionadas, permitindo separar a política da aplicação da arquitetura da subnet. [3]

| Direção | Protocolo | Origem | Porta | Finalidade |
| --- | --- | --- | --- | --- |
| Entrada | TCP | Seu IP público `/32` | 22 | SSH administrativo. |
| Entrada | TCP | `0.0.0.0/0` | 80 | HTTP e desafio de certificado. |
| Entrada | TCP | `0.0.0.0/0` | 443 | Aplicação HTTPS pública. |
| Saída | TCP | `0.0.0.0/0` | 443 | API do modelo, atualizações e renovação de certificado. |

**Não crie uma regra de entrada para a porta 8501.** Ela ficará limitada a `127.0.0.1`, acessível apenas pelo Nginx na própria VM. Se utilizar também UFW no Ubuntu, libere SSH antes de ativá-lo:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

## 3. Preparar o código e o ambiente Python

Entre por SSH, instale as dependências de sistema e crie a pasta da aplicação. Use o usuário padrão da imagem OCI ou substitua `ubuntu` pelo usuário real.

```bash
ssh -i ~/caminhos/oci-chave.pem ubuntu@IP_PUBLICO

sudo apt update
sudo apt install -y git nginx python3-venv python3-pip certbot python3-certbot-nginx

sudo mkdir -p /opt/nrv-ai-agent
sudo chown ubuntu:ubuntu /opt/nrv-ai-agent
git clone https://github.com/SEU_USUARIO/nrv-ai-agent.git /opt/nrv-ai-agent

cd /opt/nrv-ai-agent
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

Crie as configurações sensíveis apenas na VM. Não cole a chave no terminal que será gravado em histórico e nunca a versione no Git.

```bash
cd /opt/nrv-ai-agent
umask 077
nano .env
chmod 600 .env
```

O `.env` deve conter ao menos a chave do provedor, o modelo conversacional corrigido e a configuração de embeddings usada na ingestão. A configuração de embedding e sua dimensão precisam ser idênticas em `app.py` e `ingest_data.py`.

Execute a ingestão e um teste manual interno antes de criar o serviço:

```bash
.venv/bin/python ingest_data.py
.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true
```

Em uma segunda sessão SSH, valide a saúde; encerre o teste manual com `Ctrl+C` antes de continuar.

```bash
curl -fsS http://127.0.0.1:8501/_stcore/health
```

## 4. Criar e habilitar o serviço systemd

Crie o arquivo `/etc/systemd/system/nrv-ai-agent.service` como `root`:

```bash
sudo nano /etc/systemd/system/nrv-ai-agent.service
```

Cole este conteúdo, adaptando caminhos, usuário e arquivo principal:

```ini
[Unit]
Description=NRV AI Agent Streamlit
Wants=network-online.target
After=network-online.target

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/nrv-ai-agent
EnvironmentFile=/opt/nrv-ai-agent/.env
ExecStart=/opt/nrv-ai-agent/.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

[Install]
WantedBy=multi-user.target
```

O `WorkingDirectory` garante que caminhos relativos, como `./chroma_db`, sejam resolvidos a partir do projeto. `EnvironmentFile` carrega a chave sem torná-la parte do comando exibido pelo gerenciador de processos. Não use `sudo` dentro de `ExecStart`, pois o usuário do processo já é definido pela unidade.

Carregue a unidade, habilite a inicialização no boot e inicie o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nrv-ai-agent
sudo systemctl status nrv-ai-agent --no-pager
sudo systemctl is-active nrv-ai-agent
```

O resultado esperado de `is-active` é `active`. Acompanhe os logs enquanto realiza uma consulta de teste:

```bash
sudo journalctl -u nrv-ai-agent -f
```

## 5. Configurar o Nginx como proxy reverso

O Nginx recebe a conexão pública e entrega a solicitação ao Streamlit local usando `proxy_pass`. Cabeçalhos como `Host` e `X-Real-IP` podem ser definidos com `proxy_set_header`; isto preserva informações úteis da solicitação original no servidor de aplicação. [2]

Crie a configuração HTTP inicial em `/etc/nginx/sites-available/nrv-ai-agent`:

```bash
sudo nano /etc/nginx/sites-available/nrv-ai-agent
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name agente.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8501;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        proxy_buffering off;
    }
}
```

Os cabeçalhos `Upgrade` e `Connection` atendem à comunicação persistente usada pela interface do Streamlit. O `proxy_buffering off` reduz problemas de atualização incremental da interface. A diretiva `proxy_pass` repassa a solicitação HTTP ao endereço local configurado. [2]

Ative o site e valide a sintaxe antes de recarregar o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nrv-ai-agent /etc/nginx/sites-enabled/nrv-ai-agent
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl is-active nginx
```

Antes de emitir o certificado, configure um registro DNS do tipo **A** para `agente.seudominio.com` apontando ao IP público da instância. Confirme a resolução do próprio servidor:

```bash
getent hosts agente.seudominio.com
curl -I http://agente.seudominio.com
```

## 6. Habilitar HTTPS com Certbot

Somente após o DNS apontar corretamente e a porta 80 estar acessível, execute:

```bash
sudo certbot --nginx -d agente.seudominio.com
sudo certbot renew --dry-run
```

Ao ser questionado, selecione o redirecionamento de HTTP para HTTPS. Depois, valide:

```bash
curl -I https://agente.seudominio.com
curl -fsS http://127.0.0.1:8501/_stcore/health
```

O primeiro comando deve retornar uma resposta HTTP válida — normalmente `200` ou `302` conforme o comportamento do Streamlit. O segundo confirma que o processo interno está disponível, separando problemas de aplicação de problemas de proxy, DNS ou TLS.

## 7. Operação diária e atualização

Use esta sequência ao publicar uma nova versão. Faça uma cópia de segurança do diretório de dados vetoriais antes de recriá-lo.

```bash
cd /opt/nrv-ai-agent
git pull --ff-only
.venv/bin/pip install -r requirements.txt
.venv/bin/python ingest_data.py
sudo systemctl restart nrv-ai-agent
sudo systemctl status nrv-ai-agent --no-pager
curl -fsS http://127.0.0.1:8501/_stcore/health
```

Use `ingest_data.py` somente quando a fonte de conhecimento, o modelo de embedding ou a dimensão forem alterados. Se apenas `app.py` mudar, teste e reinicie o serviço sem recriar a base desnecessariamente.

| Ação | Comando |
| --- | --- |
| Ver status | `sudo systemctl status nrv-ai-agent --no-pager` |
| Ver últimos logs | `sudo journalctl -u nrv-ai-agent -n 100 --no-pager` |
| Acompanhar logs | `sudo journalctl -u nrv-ai-agent -f` |
| Reiniciar app | `sudo systemctl restart nrv-ai-agent` |
| Validar Nginx | `sudo nginx -t` |
| Recarregar Nginx | `sudo systemctl reload nginx` |
| Testar após reboot | `sudo reboot`, reconectar e executar os dois `is-active` |

## 8. Diagnóstico rápido

| Sintoma | Verificação | Correção provável |
| --- | --- | --- |
| Nginx responde `502 Bad Gateway` | `sudo systemctl status nrv-ai-agent` e `curl http://127.0.0.1:8501/_stcore/health` | Corrija o erro mostrado no journal; revise `ExecStart`, `.env`, dependências e permissões da pasta. |
| Serviço reinicia continuamente | `sudo journalctl -u nrv-ai-agent -n 100 --no-pager` | Verifique chave, identificador de modelo, coleção vetorial e imports ausentes. |
| Domínio não abre, mas health interno funciona | `sudo nginx -t`, `systemctl status nginx` e regras NSG | Confirme site habilitado, regra 80/443, DNS e firewall local. |
| Certbot falha | `getent hosts DOMINIO` e `curl -I http://DOMINIO` | Corrija DNS ou acessibilidade da porta 80 antes de repetir. |
| Agente abre, mas não responde à conversa | Logs do serviço durante a pergunta | Verifique provedor LLM, chave, modelo e conectividade de saída TCP 443. |

## 9. Teste de recuperação obrigatório

1. Faça uma consulta que use informação da tabela e registre o resultado.
2. Execute `sudo systemctl restart nrv-ai-agent`; aguarde cinco segundos e confirme health interno e página HTTPS.
3. Execute uma pergunta fora da base e confirme que o agente pede análise técnica sem inventar preço.
4. Em janela de manutenção, reinicie a VM. Após reconectar, confirme `systemctl is-active nrv-ai-agent`, `systemctl is-active nginx`, health interno e acesso HTTPS público.
5. Guarde cópia protegida do código, da planilha de serviços, dos documentos e de `chroma_db/`; não faça backup de `.env` em local público.

## Referências

[1] [systemd.service — Service unit configuration](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

[2] [NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

[3] [Oracle Cloud Infrastructure — Network Security Groups](https://docs.oracle.com/iaas/Content/Network/Concepts/networksecuritygroups.htm)
