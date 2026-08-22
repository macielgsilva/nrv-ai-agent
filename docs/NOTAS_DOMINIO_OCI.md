# Notas de configuração de domínio na OCI

Em 22 de agosto de 2026, a consulta visual ao portal do Registro.br não foi carregada pelo navegador automatizado. A disponibilidade de um domínio `.com.br` deve ser confirmada no verificador oficial pelo titular antes de qualquer registro ou pagamento.

Para este projeto, o endereço de destino atual da VM é um IP público efêmero. Antes de apontar o DNS de produção, ele deve ser convertido em IP público reservado/estático na OCI.

## Preparação para Streamlit Community Cloud

As orientações oficiais do Streamlit Community Cloud indicam que as dependências Python devem ficar em um arquivo `requirements.txt` na raiz do repositório ou no diretório do arquivo de entrada. Segredos devem ser adicionados pela interface de configurações avançadas da aplicação e nunca enviados para o Git em `.streamlit/secrets.toml`.

Fontes: <https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies> e <https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/secrets-management>.

Para a demonstração pública do NRV, a planilha de serviços foi revisada: ela contém somente categorias, descrições, preços estimados, prazos e observações de serviço; não foram encontrados dados pessoais na fonte. A base ChromaDB gerada permanece excluída do controle de versão, pois é derivada e efêmera no Community Cloud.
