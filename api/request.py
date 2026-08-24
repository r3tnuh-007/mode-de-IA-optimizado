import requests

response = requests.post(
	"http://127.0.0.1:8000/perguntar",
	json={"pergunta": "Quem venceu o jogo da copa?"}
)
print(response.json())
