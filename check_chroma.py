import chromadb
try:
    print(f"ChromaDB version: {chromadb.__version__}")
    client = chromadb.HttpClient(host='localhost', port=8000)
    print("Successfully imported and created HttpClient")
except Exception as e:
    print(f"Error: {e}")
