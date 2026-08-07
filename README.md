_Project made by aluis_
# modelo-de-IA-optimizado

Primeiro estarei começando o treino para aprender ML e DL
Depois que eu dominar os dois conceitos devo pensar em maneiras de optimizar o modelo

# Prompts de testes
deteção de emoções

# Chat conversation (Desafio LLM offline)

## Query
com base nessas restrições mostre como implementar uma solução que resolva o problema.

## Answer

Para implementar uma solução que atenda às restrições do desafio dentro do prazo, vou apresentar um roteiro prático e focado.

A estratégia consiste em usar um modelo de linguagem pequeno (SLM) já otimizado, executado por uma engine C++ de alto desempenho. Esta abordagem é ideal para hardware com recursos limitados, pois prioriza eficiência e controle de memória.
A Solução Passo a Passo

O plano é dividido em três etapas principais:

    Preparar o Ambiente e a Ferramenta de Inferência (C++)

    Escolher e Baixar um Modelo Otimizado

    Executar e Testar a Aplicação

### 1. Preparar o Ambiente no Ubuntu 22.04 LTS

Esta etapa garante que o sistema esteja pronto para receber a engine de inferência e o modelo.

    Atualizar o sistema e instalar dependências essenciais: É fundamental ter as ferramentas de compilação (build-essential), o cmake e o git instalados .

```bash
sudo apt update
sudo apt install -y build-essential cmake git wget
```

	(Opcional) Obter uma versão pré-compilada do llama.cpp: Para poupar tempo e evitar possíveis problemas de compilação, você pode usar um binário pré-compilado para Ubuntu 22.04 disponível em repositórios de terceiros .

```bash
wget https://github.com/waqasm86/Ubuntu-Cuda-Llama.cpp-Executable/releases/latest/download/llama.cpp-ubuntu-cuda-x64.tar.xz
tar -xf llama.cpp-ubuntu-cuda-x64.tar.xz
cd llama-cpp-cuda/bin
```

	(Recomendado) Compilar o llama.cpp do código-fonte: Compilar a partir do repositório oficial garante que você tenha a versão mais estável e pode otimizá-la para seu hardware .
```bash
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

Se o seu laptop tiver uma GPU NVIDIA compatível, você pode ativar a aceleração CUDA para aumentar a velocidade :
```bash
cmake .. -DLLAMA_CUBLAS=ON -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

### 2. Escolher e Baixar um Modelo Compatível

A chave para o sucesso está em escolher um modelo pequeno e quantizado.

    Critérios de seleção: Modelos com 1 a 3 bilhões de parâmetros são ideais para rodar em CPU com 8GB de RAM. Além disso, a quantização é essencial: o formato GGUF com a quantização Q4_K_M oferece o melhor equilíbrio entre tamanho, velocidade e qualidade.

    Modelos recomendados:

        Gemma 3 1B (Google): Excelente ponto de partida. O arquivo quantizado Q4_K_M tem cerca de 700 MB, o que é perfeitamente viável .

        DeepSeek-R1-Distill-Qwen-1.5B: Outra opção muito leve e performática para este tipo de hardware .

        TinyLlama 1.1B: Um modelo consolidado, projetado especificamente para ser pequeno e eficiente.

    Download: Use o wget para baixar o arquivo .gguf diretamente do Hugging Face para o seu diretório de trabalho .

```bash
# Primeiro, configure seu token (substitua SEU_TOKEN pelo token real)
export HF_TOKEN="SEU_TOKEN_AQUI"

# Baixar o Gemma Q3_K_M
wget --header "Authorization: Bearer $HF_TOKEN" https://huggingface.co/tensorblock/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q3_K_M.gguf
```

3. Executar e Testar a Aplicação

Com a engine e o modelo prontos, é hora de executar.

    Interface de linha de comando (CLI): O llama.cpp oferece um executável llama-cli para interações diretas. Use o comando -m para apontar o modelo e -p para a sua pergunta .

```bash
./llama-cli -m gemma-3-1b-it-Q4_K_M.gguf -p "Explique o conceito de agricultura de precisão."
#ou
./llama-cli -m gemma-3-1b-it-Q3_K_M.gguf -p "Teste"
```

	Servidor HTTP e interface web: Para uma experiência mais amigável, use o llama-server, que cria um servidor local. Você pode então acessá-lo pelo navegador http://localhost:8090
```bash
# Iniciar o servidor com o modelo
./llama-server -m gemma-3-1b-it-Q3_K_M.gguf --port 8090 -c 512
```
O argumento -c 512 define o tamanho do contexto, o que ajuda a controlar o uso de memória.

# Conclusion

## Verificação da Solução
<table>
  <thead>
    <tr>
      <th>Restrição do Desafio</th>
      <th>Como a Solução Atende</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>8 GB RAM</td>
      <td>Modelos com 1B-3B parâmetros e quantização Q4_K_M (ex: ~700 MB) têm baixo consumo de memória.</td>
    </tr>
    <tr>
      <td>Intel Core i5 10ª-12ª geração</td>
      <td>O llama.cpp é otimizado para CPU com instruções AVX2, presentes nesses processadores.</td>
    </tr>
	 <tr>
      <td>Ubuntu 22.04 LTS</td>
      <td>O guia foi construído para este SO, com comandos apt e compatibilidade total .</td>
    </tr>
	 <tr>
      <td>Funcionar Offline</td>
      <td>A engine e o modelo são executados localmente, sem necessidade de internet .</td>
    </tr>
	 <tr>
      <td>Não ultrapassar 7 GB</td>
      <td>O consumo total, com modelo e engine, fica significativamente abaixo do limite, como demonstrado por projetos similares .</td>
    </tr>
	 <tr>
      <td>Prêmio de Adaptação Africana (15%)</td>
      <td>O modelo base pode ser ajustado (fine-tuning) ou utilizado com prompts e dados em línguas africanas.</td>
    </tr>
  </tbody>
</table>



