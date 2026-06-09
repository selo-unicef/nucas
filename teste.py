
import pandas as pd
import requests

url = "https://api-selo-unicef-cloudrun-839032982303.us-central1.run.app/acoes-nuca/"

response = requests.get(url, timeout=60)
response.raise_for_status()

dados = response.json()

df = pd.DataFrame(dados)

contagem_status = (
    df["status"]
    .fillna("")
    .astype(str)
    .str.strip()
    .replace("", "(vazio)")
    .value_counts()
    .reset_index()
)

contagem_status.columns = ["status", "quantidade"]

print(contagem_status)