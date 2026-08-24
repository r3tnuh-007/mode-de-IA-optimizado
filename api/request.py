import requests

response = requests.post(
	"http://127.0.0.1:8000/perguntar",
	json={"pergunta": "Who won the copa game"}
)
print(response.json())
