# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import os
import chromadb
from sentence_transformers import SentenceTransformer

# --- Configurações ---
LLAMA_SERVER_URL = "http://127.0.0.1:8080/v1"  # URL do seu llama-server
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "conhecimento_agricola"
TOP_K_RETRIEVALS = 3

# --- Inicialização do FastAPI ---
app = FastAPI(title="Agricultural RAG API", description="API to query agricultural knowledge using RAG.")

# --- Inicialização do ChromaDB e Embeddings (carregados uma vez na inicialização) ---
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
# Usamos o mesmo embedding function para pesquisar
from utils.ingest import SentenceTransformerEmbeddingFunction
embedding_fn = SentenceTransformerEmbeddingFunction()
collection = chroma_client.get_collection(name=COLLECTION_NAME, embedding_function=embedding_fn)

# --- Modelos de Dados para a Requisição e Resposta ---
class QueryRequest(BaseModel):
    pergunta: str
    top_k: int = TOP_K_RETRIEVALS

class QueryResponse(BaseModel):
    pergunta: str
    resposta: str
    fontes: list

# --- Função de Busca (RAG) ---
def buscar_contexto(pergunta: str, top_k: int):
    """Busca os chunks mais relevantes no ChromaDB."""
    try:
        results = collection.query(
            query_texts=[pergunta],
            n_results=top_k
        )
        # results é um dicionário com 'documents', 'metadatas', 'distances'
        documentos = results['documents'][0] if results['documents'] else []
        metadados = results['metadatas'][0] if results['metadatas'] else []
        return documentos, metadados
    except Exception as e:
        print(f"Erro na busca: {e}")
        return [], []

# --- Função para Gerar Resposta com o LLM (llama-server) ---
def gerar_resposta(pergunta: str, contexto: str):
    """Envia o prompt para o llama-server e retorna a resposta."""
    # Construindo o prompt com o contexto recuperado
    prompt = f"""You are an assistant specializing in agriculture.
Use ONLY the following context to answer the question.
If you do not know the answer, simply say "I do not know".

Context:
{contexto}

Question: {pergunta}
Response: """

    payload = {
        "model": "local-model",  # O alias usado no llama-server. Pode ser qualquer nome.
        "prompt": prompt,
        "stream": False,
        "max_tokens": 256,
        "temperature": 0.3
    }

    try:
        response = requests.post(f"{LLAMA_SERVER_URL}/completions", json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["text"].strip()
    except requests.exceptions.RequestException as e:
        print(f"Error calling llama-server: {e}")
        return "Sorry, something went wrong generating the response."

# --- Endpoint da API ---
@app.post("/perguntar", response_model=QueryResponse)
async def perguntar(request: QueryRequest):
    """Recebe uma pergunta e retorna uma resposta baseada no conhecimento indexado."""
    pergunta = request.pergunta
    top_k = request.top_k

    # 1. Recuperar o contexto relevante
    docs, metadados = buscar_contexto(pergunta, top_k)
    if not docs:
        raise HTTPException(status_code=404, detail="No relevant document found.")

    contexto = "\n\n".join(docs)

    # 2. Gerar a resposta final
    resposta = gerar_resposta(pergunta, contexto)

    # 3. Preparar as fontes para a resposta
    fontes = []
    for meta in metadados:
        fonte_nome = meta.get("source", "Unknown source")
        if fonte_nome not in fontes:
            fontes.append(fonte_nome)

    return QueryResponse(pergunta=pergunta, resposta=resposta, fontes=fontes)

# --- Ponto de entrada para execução direta (opcional) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
