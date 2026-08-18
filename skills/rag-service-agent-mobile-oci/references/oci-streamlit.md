# Referência rápida: Streamlit em Windows e OCI

## Teste local no Windows

```powershell
py -3.10 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python ingest_data.py
streamlit run app.py --server.runOnSave true
```

Abra `http://localhost:8501`. Se `streamlit` não for encontrado, execute `python -m streamlit run app.py`. Para porta ocupada, acrescente `--server.port 8502`.

## Sequência OCI

1. Crie a instância Linux, limite SSH ao IP administrativo e libere somente 80/443 ao público.
2. Instale `git`, `nginx`, `python3-venv`, `python3-pip`, `certbot` e o plugin Nginx.
3. Clone o repositório em `/opt/<projeto>`, crie `.venv`, instale requisitos e crie `.env` diretamente na VM com `chmod 600`.
4. Rode a ingestão, valide a resposta interna e ative os modelos `systemd` e Nginx.
5. Aponte o DNS, emita o certificado e execute a validação pública.

## Pré-deploy mínimo

- `.env` e chaves não estão no Git.
- Base vetorial foi recriada usando a configuração de embedding atual.
- Serviço responde em `127.0.0.1:8501`.
- Nginx passa em `nginx -t`.

## Pós-deploy mínimo

- `systemctl is-active <serviço>` e `systemctl is-active nginx` retornam `active`.
- `curl -fsS http://127.0.0.1:8501/_stcore/health` responde sem falha.
- `curl -I https://<domínio>` retorna sucesso ou redirecionamento esperado.
- Pergunta coberta informa dados da tabela; pergunta fora da base solicita avaliação técnica.
- Logs e cópia de segurança do código e ChromaDB foram verificados.
