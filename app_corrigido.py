import os

import streamlit as st
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings


load_dotenv()

st.set_page_config(page_title="Agente NRV Informática", page_icon="💻", layout="centered")
st.title("💻 Atendimento Service Desk — NRV Informática")
st.markdown("Descreva o problema do equipamento para iniciar um pré-orçamento.")

def setting(name: str, default: str | None = None) -> str | None:
    """Lê configuração do ambiente ou dos segredos do Streamlit sem exibi-los."""
    value = os.getenv(name)
    if value:
        return value
    try:
        secret = st.secrets.get(name)
    except Exception:
        secret = None
    return str(secret) if secret not in (None, "") else default


def enabled(name: str, default: bool = False) -> bool:
    value = setting(name, str(default))
    return str(value).strip().lower() in {"1", "true", "yes", "sim"}


GOOGLE_API_KEY = setting("GOOGLE_API_KEY") or setting("GEMINI_API_KEY")
CHROMA_DIR = setting("CHROMA_DIR", "./chroma_db")
CHROMA_COLLECTION = setting("CHROMA_COLLECTION", "nrv_informatica")

# gemini-2.5-flash deixou de estar disponível para novos usuários.
# A variável permite trocar a versão no .env sem alterar o código.
GEMINI_MODEL = setting("GEMINI_MODEL", "gemini-3.6-flash")
EMBEDDING_MODEL = setting("EMBEDDING_MODEL", "gemini-embedding-2")
EMBEDDING_DIMENSION = int(setting("EMBEDDING_DIMENSION", "768") or "768")
TOP_K = int(setting("RAG_TOP_K", "4") or "4")
AUTO_BUILD_CHROMA = enabled("AUTO_BUILD_CHROMA", False)


def configuration_error_message(error: Exception) -> str:
    """Converte erros previsíveis em orientação objetiva para quem opera o app."""
    details = str(error).lower()

    if "not_found" in details or "404" in details:
        return (
            f"O modelo configurado ({GEMINI_MODEL}) não está disponível para esta chave. "
            "Verifique GEMINI_MODEL no arquivo .env e use um modelo liberado para sua conta."
        )
    if "embedding" in details:
        return (
            "Não foi possível abrir os embeddings da base. Confirme EMBEDDING_MODEL e "
            "recrie o ChromaDB com ingest_data.py se o modelo ou a dimensão tiverem mudado."
        )
    if isinstance(error, FileNotFoundError):
        return str(error)
    return "Não foi possível carregar a base de conhecimento. Verifique a configuração e tente novamente."


@st.cache_resource
def load_chain():
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "Chave da API do Google não encontrada. Configure GOOGLE_API_KEY ou GEMINI_API_KEY no arquivo .env."
        )

    if not os.path.isdir(CHROMA_DIR):
        if AUTO_BUILD_CHROMA:
            from ingest_data import create_vector_store

            create_vector_store()
        else:
            raise FileNotFoundError(
                f"Diretório Chroma não encontrado: {CHROMA_DIR}. Execute ingest_data.py para criar a base."
            )

    embeddings = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=GOOGLE_API_KEY,
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    vectorstore = Chroma(
        collection_name=CHROMA_COLLECTION,
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
    )

    if vectorstore._collection.count() == 0:
        if AUTO_BUILD_CHROMA:
            from ingest_data import create_vector_store

            create_vector_store()
            vectorstore = Chroma(
                collection_name=CHROMA_COLLECTION,
                persist_directory=CHROMA_DIR,
                embedding_function=embeddings,
            )
        if vectorstore._collection.count() == 0:
            raise RuntimeError("A coleção Chroma está vazia. Execute ingest_data.py para recriar a base.")

    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GOOGLE_API_KEY,
        temperature=0.2,
        max_retries=2,
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})

    system_prompt = """
Você é o agente virtual especialista de primeiro atendimento da NRV Informática.
Seu objetivo é fazer uma triagem técnica e fornecer pré-orçamentos baseados
EXCLUSIVAMENTE no contexto recuperado da base de conhecimento.

REGRAS ESTRITAS:
1. Seja cordial, analítico e profissional.
2. Nunca invente preços, prazos, serviços, peças, diagnósticos ou procedimentos.
3. Não apresente diagnóstico definitivo quando as informações forem insuficientes.
4. Quando houver preço no contexto, apresente-o como pré-orçamento sujeito à confirmação após avaliação técnica.
5. Se o contexto não cobrir a pergunta, informe que será necessária análise em bancada no valor de R$ 50,00.
6. Se faltarem informações, faça perguntas objetivas ao cliente.

CONTEXTO RECUPERADO:
{context}
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    document_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, document_chain)


try:
    chain = load_chain()
except Exception as error:
    st.error(configuration_error_message(error))
    st.info("Após alterar o modelo de embedding ou sua dimensão, execute ingest_data.py para reconstruir a base vetorial.")
    st.stop()

if "messages" not in st.session_state:
    st.session_state.messages = [{
        "role": "assistant",
        "content": "Olá! Sou o agente virtual da NRV Informática. Qual sintoma seu computador apresenta hoje?",
    }]

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ex.: Meu computador faz vários bipes ao ligar."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Consultando manuais e tabela de preços..."):
            try:
                response = chain.invoke({"input": prompt})
                answer = response["answer"]
                st.markdown(answer)
            except Exception as error:
                answer = configuration_error_message(error)
                st.error(answer)

    st.session_state.messages.append({"role": "assistant", "content": answer})
