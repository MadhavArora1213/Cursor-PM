import requests
import json

url = "http://localhost:11434/api/embeddings"
data = {
    "model": "qwen2.5:3b",
    "prompt": "test"
}

response = requests.post(url, json=data)
if response.status_code == 200:
    embedding = response.json()["embedding"]
    print(f"Dimension: {len(embedding)}")
else:
    print(f"Error: {response.text}")
