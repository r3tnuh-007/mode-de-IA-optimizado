# Instale o gerenciador de pacotes uv (opcional, mas recomendado)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Crie e ative um ambiente virtual
uv venv --python 3.11
source .venv/bin/activate.fish

# Instale as dependências principais
uv add torch torchvision torchaudio
uv add "transformers>=4.51.0" datasets peft trl accelerate
uv add unsloth bitsandbytes
uv add huggingface_hub
