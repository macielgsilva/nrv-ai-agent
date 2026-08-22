"""Cria localmente a base vetorial da demonstração NRV a partir dos dados versionados."""

import os
import shutil
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


load_dotenv()


def setting(name: str, default: str | None = None) -> str | None:
    """Obtém configurações do ambiente, sem registrar valores sensíveis."""
    return os.getenv(name) or default


GOOGLE_API_KEY = setting("GOOGLE_API_KEY") or setting("GEMINI_API_KEY")
CHROMA_DIR = setting("CHROMA_DIR", "./chroma_db")
CHROMA_COLLECTION = setting("CHROMA_COLLECTION", "nrv_informatica")
EMBEDDING_MODEL = setting("EMBEDDING_MODEL", "gemini-embedding-2")
EMBEDDING_DIMENSION = int(setting("EMBEDDING_DIMENSION", "768") or "768")
EXCEL_FILE = setting("EXCEL_FILE", "data/Tabela_Servicos_NRV.xlsx")


def load_documents() -> list[Document]:
    """Transforma a tabela pública de serviços em documentos recuperáveis."""
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY ou GEMINI_API_KEY não foi configurada.")

    excel_path = Path(EXCEL_FILE or "")
    if not excel_path.is_file():
        raise FileNotFoundError(
            f"Planilha de serviços não encontrada: {excel_path}. "
            "Defina EXCEL_FILE com um arquivo aprovado para publicação."
        )

    dataframe = pd.read_excel(excel_path)
    required_columns = {
        "Item/Periférico",
        "Categoria",
        "Tipo de Serviço",
        "Preço Estimado (R$)",
        "Prazo Médio",
        "Observações",
    }
    missing_columns = sorted(required_columns.difference(dataframe.columns))
    if missing_columns:
        raise ValueError(
            "Colunas obrigatórias não encontradas na planilha: "
            + ", ".join(missing_columns)
        )

    documents: list[Document] = []
    for index, row in dataframe.iterrows():
        documents.append(
            Document(
                page_content=(
                    f"Serviço/Peça: {row['Item/Periférico']}. "
                    f"Categoria: {row['Categoria']}. "
                    f"Tipo: {row['Tipo de Serviço']}. "
                    f"Preço: {row['Preço Estimado (R$)']}. "
                    f"Prazo: {row['Prazo Médio']}. "
                    f"Observação: {row['Observações']}."
                ),
                metadata={"source": "tabela_servicos_publica", "linha": int(index)},
            )
        )
    return documents


def create_vector_store() -> int:
    """Reconstrói integralmente a coleção para evitar embeddings incompatíveis."""
    documents = load_documents()
    if not documents:
        raise RuntimeError("A planilha não possui serviços para indexar.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)

    chroma_path = Path(CHROMA_DIR or "./chroma_db")
    if chroma_path.exists():
        shutil.rmtree(chroma_path)

    embeddings = GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=GOOGLE_API_KEY,
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=CHROMA_COLLECTION,
        persist_directory=str(chroma_path),
    )
    return vectorstore._collection.count()


if __name__ == "__main__":
    total = create_vector_store()
    print(f"Base vetorial criada com {total} documentos indexados.")
