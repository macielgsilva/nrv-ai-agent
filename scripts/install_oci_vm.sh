#!/usr/bin/env bash
# Instala e configura o agente NRV Streamlit em Ubuntu 24.04 na OCI.
# Pode ser chamado como: bash scripts/install_oci_vm.sh [opções]
# Também funciona caso seja copiado e executado diretamente dentro de streamlit-agent/.

set -Eeuo pipefail
IFS=$'\n\t'

readonly SERVICE_NAME="nrv-ai-agent"
readonly SERVICE_PORT="8501"
INSTALL_CERTBOT=false
ENABLE_UFW=false
RUN_INGEST=false
DOMAIN=""

log() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERRO: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Uso: bash scripts/install_oci_vm.sh [opções]

Opções:
  --ingest              Cria ou atualiza a base ChromaDB ao final da instalação.
  --domain DOMINIO      Configura o Nginx para o domínio informado.
  --enable-ufw          Libera somente SSH, HTTP e HTTPS no firewall UFW.
  --install-certbot     Instala o Certbot. O certificado é emitido somente após o DNS apontar para a VM.
  --help                Exibe esta ajuda.

O script procura automaticamente app.py no diretório atual, no diretório do script,
em seus diretórios-pai e em uma subpasta streamlit-agent/. Não execute como root.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ingest) RUN_INGEST=true ;;
    --domain)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "Informe um domínio após --domain."
      DOMAIN="$2"
      shift
      ;;
    --enable-ufw) ENABLE_UFW=true ;;
    --install-certbot) INSTALL_CERTBOT=true ;;
    --help|-h) usage; exit 0 ;;
    *) die "Opção desconhecida: $1. Use --help para consultar as opções." ;;
  esac
  shift
done

[[ "${EUID}" -ne 0 ]] || die "Execute como o usuário ubuntu, sem sudo: bash scripts/install_oci_vm.sh"

SCRIPT_SOURCE="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd -P)"
CURRENT_DIR="$(pwd -P)"

find_app_dir() {
  local candidate
  local -a candidates=(
    "$CURRENT_DIR"
    "$SCRIPT_DIR"
    "$SCRIPT_DIR/.."
    "$SCRIPT_DIR/../streamlit-agent"
    "$CURRENT_DIR/streamlit-agent"
  )

  for candidate in "${candidates[@]}"; do
    candidate="$(cd "$candidate" 2>/dev/null && pwd -P || true)"
    if [[ -n "$candidate" && -f "$candidate/app.py" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

APP_DIR="$(find_app_dir || true)"
[[ -n "$APP_DIR" ]] || die "Não encontrei app.py. Execute o script dentro de streamlit-agent/ ou use: cd /opt/nrv/nrv-informatica-distribuicao/streamlit-agent"
[[ -f "$APP_DIR/requirements.txt" ]] || die "Não encontrei requirements.txt em $APP_DIR."
PROJECT_DIR="$(dirname "$APP_DIR")"
ENV_FILE="$APP_DIR/.env"
VENV_DIR="$APP_DIR/.venv"

log "Aplicação localizada em: $APP_DIR"

log "Atualizando os pacotes do sistema"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  python3-venv python3-pip unzip nginx

if [[ "$INSTALL_CERTBOT" == true ]]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
fi

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  log "Criando o ambiente Python isolado"
  python3 -m venv "$VENV_DIR"
fi

log "Instalando as dependências Python"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$APP_DIR/requirements.txt"

if [[ ! -f "$ENV_FILE" ]]; then
  log "Configurando a chave Gemini"
  read -r -s -p "Cole a chave Gemini e pressione Enter (ela não aparecerá): " GOOGLE_API_KEY
  printf '\n'
  [[ -n "$GOOGLE_API_KEY" ]] || die "A chave Gemini não pode ficar vazia."
  umask 077
  cat > "$ENV_FILE" <<EOF
GOOGLE_API_KEY=$GOOGLE_API_KEY
GEMINI_MODEL=gemini-3.6-flash
CHROMA_DIR=./chroma_db
CHROMA_COLLECTION=nrv_informatica
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSION=768
RAG_TOP_K=4
EOF
  chmod 600 "$ENV_FILE"
else
  log "Arquivo .env existente preservado"
fi

if [[ "$RUN_INGEST" == true ]]; then
  [[ -f "$APP_DIR/ingest_data.py" ]] || die "Não encontrei ingest_data.py em $APP_DIR."
  log "Criando ou atualizando a base de conhecimento ChromaDB"
  (
    cd "$APP_DIR"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    "$VENV_DIR/bin/python" ingest_data.py
  )
fi

log "Criando o serviço systemd"
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null <<EOF
[Unit]
Description=NRV AI Agent Streamlit
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(id -un)
Group=$(id -gn)
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$VENV_DIR/bin/streamlit run app.py --server.address 127.0.0.1 --server.port $SERVICE_PORT --server.headless true
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

SERVER_NAME="_"
[[ -n "$DOMAIN" ]] && SERVER_NAME="$DOMAIN"
log "Configurando o Nginx"
sudo tee "/etc/nginx/sites-available/${SERVICE_NAME}" > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://127.0.0.1:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
EOF

sudo ln -sfn "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"
sudo systemctl enable --now nginx
sudo systemctl reload nginx

if [[ "$ENABLE_UFW" == true ]]; then
  log "Configurando o firewall UFW"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ufw
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw --force enable
fi

log "Verificando a saúde do agente"
sleep 2
curl --fail --silent --show-error "http://127.0.0.1:${SERVICE_PORT}/_stcore/health" >/dev/null || {
  sudo journalctl -u "$SERVICE_NAME" -n 60 --no-pager >&2
  die "O serviço não respondeu na verificação de saúde."
}

printf '\nInstalação concluída. Serviço: %s\n' "$(systemctl is-active "$SERVICE_NAME")"
printf 'Teste no navegador: http://IP_PUBLICO_DA_OCI\n'
if [[ -n "$DOMAIN" && "$INSTALL_CERTBOT" == true ]]; then
  printf 'Após apontar o DNS para esta VM, emita HTTPS com: sudo certbot --nginx -d %s\n' "$DOMAIN"
fi
