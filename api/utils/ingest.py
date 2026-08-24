# ingest.py
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions
import os
import glob
from typing import List

# Configurações
DOCS_DIR = "./documents"  # Pasta onde seus documentos estão
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "conhecimento_agricola"

# 1. Inicializar o cliente ChromaDB
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

# 2. Função de embedding local (usando sentence-transformers)
class SentenceTransformerEmbeddingFunction(embedding_functions.EmbeddingFunction):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name

    def __call__(self, input: List[str]) -> List[List[float]]:
        # O ChromaDB passa uma lista de strings
        embeddings = self.model.encode(input, convert_to_numpy=True).tolist()
        return embeddings

embedding_fn = SentenceTransformerEmbeddingFunction()

# 3. Criar ou obter a coleção no ChromaDB
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_fn
)

# 4. Função para ler e "chunkear" documentos (exemplo simples)
def load_documents_from_folder(folder_path: str):
    documents = []
    file_paths = glob.glob(os.path.join(folder_path, "*.txt")) + glob.glob(os.path.join(folder_path, "*.pdf"))

    for file_path in file_paths:
        # Aqui você deve implementar a leitura para .txt, .pdf, .md, etc.
        # Para simplificar, vamos ler arquivos .txt
        if file_path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
                # Chunking simples: dividir por parágrafos ou tamanho fixo
                chunks = [p for p in text.split('\n\n') if len(p) > 50] # Exemplo
                for i, chunk in enumerate(chunks):
                    documents.append({
                        'id': f"{os.path.basename(file_path)}_{i}",
                        'text': chunk,
                        'metadata': {"source": os.path.basename(file_path)}
                    })
    return documents

print("🔄 Iniciando ingestão de documentos...")
docs_to_index = load_documents_from_folder(DOCS_DIR)

if not docs_to_index:
    print("Nenhum documento encontrado para indexar.")
else:
    # Adicionar os documentos à coleção
    # O ChromaDB pode lidar com adições em lote
    batch_size = 100
    for i in range(0, len(docs_to_index), batch_size):
        batch = docs_to_index[i:i+batch_size]
        collection.add(
            ids=[doc['id'] for doc in batch],
            documents=[doc['text'] for doc in batch],
            metadatas=[doc['metadata'] for doc in batch]
        )
        print(f"✅ Indexados {len(batch)} chunks...")

print("✅ Ingestão concluída!")
