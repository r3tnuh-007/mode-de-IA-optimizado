# finetune.py
from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
from peft import LoraConfig

# 1. Configurações
MODEL_NAME = "google/gemma-3-1b-it"
OUTPUT_DIR = "./gemma-agri-finetuned"
MAX_SEQ_LENGTH = 2048 # Ajuste conforme sua memória
LORA_RANK = 128 # Rank de 128 é comum para Gemma 1B [citation:1][citation:6][citation:11]

# 2. Carregar o dataset
print("📥 Carregando dataset...")
dataset = load_dataset("RayNene/Agricultural-QA-Data-4-East-Africa", split="train")
print(f"✅ Dataset carregado com {len(dataset)} exemplos.")

# 3. Função para formatar os exemplos para o template do Gemma
# Usamos os campos 'enhanced_prompt' e 'enhanced_completion' para um fine-tuning mais rico [citation:2][citation:12]
def format_example(example):
    # O template de chat do Gemma é importante para manter o formato de instrução [citation:6]
    messages = [
        {"role": "user", "content": example["enhanced_prompt"]},
        {"role": "assistant", "content": example["enhanced_completion"]},
    ]
    return {"text": tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)}

# 4. Carregar modelo e tokenizador em 4-bits com Unsloth
print("🔧 Carregando modelo e tokenizador...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)
print("✅ Modelo e tokenizador carregados.")

# 5. Aplicar o template ao dataset
print("🔄 Formatando dataset...")
dataset = dataset.map(format_example, remove_columns=dataset.column_names)

# 6. Configurar o adaptador LoRA
print("⚙️ Configurando LoRA...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"], # Módulos comuns para Gemma [citation:1][citation:6]
    lora_alpha=LORA_RANK,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# 7. Configurar o treinador SFTTrainer
print("🏋️‍♂️ Iniciando treinamento...")
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=2, # Número de épocas de projetos similares [citation:1][citation:6][citation:11]
        per_device_train_batch_size=4, # Ajuste para caber na memória da GPU
        gradient_accumulation_steps=4,
        warmup_steps=10,
        learning_rate=3e-5, # Taxa de aprendizado comum [citation:11]
        logging_steps=10,
        save_steps=50,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        report_to="none",
    ),
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
)

# 8. Executar o treinamento
trainer.train()

# 9. Salvar o modelo final (modelo base + adaptadores LoRA)
print(f"💾 Salvando modelo fine-tuned em {OUTPUT_DIR}")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print("✅ Fine-tune concluído!")

# Para usar o modelo diretamente com HF (sem conversão), você pode fazer:
# from peft import PeftModel
# base_model = AutoModelForCausalLM.from_pretrained(...)
# final_model = PeftModel.from_pretrained(base_model, OUTPUT_DIR)
