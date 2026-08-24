// ===== js/main.js =====
document.addEventListener('DOMContentLoaded', () => {

    // ----- ELEMENTOS DOM -----
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerBtn');
    const newSessionBtn = document.getElementById('newSessionBtn');
    const historyList = document.getElementById('historyList');
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const ttsToggle = document.getElementById('ttsToggle');

    // ----- ESTADO -----
    let currentSessionId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    let sessions = {};          // { sessionId: [ { role, content }, ... ] }
    let sessionOrder = [];      // lista de IDs em ordem (mais recente no final)
    let ttsEnabled = false;
    let isProcessing = false;   // evita múltiplos envios
    let speechSynth = window.speechSynthesis;
    let utterance = null;

    // ----- INICIALIZAÇÃO: primeira sessão -----
    function initFirstSession() {
        sessions[currentSessionId] = [
            { role: 'bot', content: 'Olá! Como posso ajudar hoje?' }
        ];
        sessionOrder = [currentSessionId];
        renderHistory();
        renderMessages(currentSessionId);
    }

    // ----- RENDER: histórico (menu lateral) -----
    function renderHistory() {
        if (sessionOrder.length === 0) {
            historyList.innerHTML = `<li class="history-placeholder">Nenhuma conversa ainda</li>`;
            return;
        }
        let html = '';
        // exibir do mais antigo ao mais recente (top->bottom)
        sessionOrder.forEach((id, index) => {
            const msgs = sessions[id] || [];
            const firstUserMsg = msgs.find(m => m.role === 'user');
            const preview = firstUserMsg ? firstUserMsg.content.slice(0, 40) : 'Conversa vazia';
            const isActive = (id === currentSessionId);
            const activeClass = isActive ? 'active-session' : '';
            // tentar pegar data/hora para diferenciar (usamos timestamp)
            const label = preview + (preview.length >= 40 ? '…' : '');
            html += `<li class="${activeClass}" data-session-id="${id}">${label}</li>`;
        });
        historyList.innerHTML = html;

        // Adicionar event listeners para cada item do histórico (mudar sessão)
        document.querySelectorAll('.history-list li[data-session-id]').forEach(li => {
            li.addEventListener('click', (e) => {
                const id = li.dataset.sessionId;
                if (id && id !== currentSessionId) {
                    switchSession(id);
                }
                // Fechar sidebar em mobile
                if (window.innerWidth <= 720) {
                    sidebar.classList.remove('open');
                }
            });
        });
    }

    // ----- RENDER: mensagens da sessão ativa -----
    function renderMessages(sessionId) {
        const msgs = sessions[sessionId] || [];
        chatMessages.innerHTML = '';
        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.role}`;
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = msg.role === 'bot' ? '🤖' : '👤';
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.textContent = msg.content;
            div.appendChild(avatar);
            div.appendChild(bubble);
            chatMessages.appendChild(div);
        });
        // scroll para o final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ----- MUDAR DE SESSÃO -----
    function switchSession(sessionId) {
        if (!sessions[sessionId]) return;
        currentSessionId = sessionId;
        renderHistory();
        renderMessages(currentSessionId);
        // cancelar qualquer leitura em andamento
        if (speechSynth.speaking) speechSynth.cancel();
    }

    // ----- CRIAR NOVA SESSÃO -----
    function createNewSession() {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        sessions[newId] = [
            { role: 'bot', content: 'Olá! Como posso ajudar hoje?' }
        ];
        sessionOrder.push(newId);
        currentSessionId = newId;
        renderHistory();
        renderMessages(currentSessionId);
        // Fechar sidebar em mobile
        if (window.innerWidth <= 720) {
            sidebar.classList.remove('open');
        }
        // cancelar leitura
        if (speechSynth.speaking) speechSynth.cancel();
        // limpar input
        userInput.value = '';
        typingIndicator.classList.remove('show');
        isProcessing = false;
    }

    // ----- ADICIONAR MENSAGEM (user + resposta IA) -----
    function addMessage(role, content) {
        if (!sessions[currentSessionId]) {
            sessions[currentSessionId] = [];
        }
        sessions[currentSessionId].push({ role, content });
        renderMessages(currentSessionId);
        renderHistory(); // atualiza preview
    }

    // ----- SIMULAÇÃO DE RESPOSTA DA IA (com latência mínima) -----
    function simulateAIResponse(userMessage) {
        // Respostas variadas para dar sensação de IA real
        const responses = [
            "Interessante! Pode me contar mais sobre isso?",
            "Entendo. Como posso ajudar com esse assunto?",
            "Ótima pergunta! Vou pensar um pouco...",
            "Que legal! Você tem experiência com isso?",
            "Hmm, isso me faz refletir. E se a gente abordar de outro ângulo?",
            "Compreendo. Existem várias perspectivas sobre isso.",
            "Adoro esse tópico! Vamos explorar juntos.",
            "Isso me lembra de algo... já ouviu falar sobre o efeito Dunning-Kruger?",
            "Pode elaborar um pouco mais?",
            "Fantástico! Continue, estou ouvindo atentamente."
        ];
        // Escolhe uma resposta baseada no comprimento da mensagem para variar
        const idx = (userMessage.length * 7 + userMessage.charCodeAt(0) || 0) % responses.length;
        return responses[idx];
    }

    // ----- ENVIAR MENSAGEM (fluxo principal) -----
    function handleSend() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;

        // Se a sessão atual estiver vazia (sem mensagens), mantém a saudação, mas adicionamos
        // Garantir que a sessão exista
        if (!sessions[currentSessionId]) {
            sessions[currentSessionId] = [];
        }

        // Adiciona mensagem do usuário
        addMessage('user', text);
        userInput.value = '';
        isProcessing = true;

        // Mostra indicador de "pensando" com delay mínimo para parecer responsivo
        typingIndicator.classList.add('show');

        // Simula latência da IA (entre 400ms e 1300ms) - UX responsiva
        const delay = Math.floor(Math.random() * 600) + 350;

        // Armazenar referência para possível cancelamento (não necessário aqui)
        const timeoutId = setTimeout(() => {
            // Gera resposta da IA
            const reply = simulateAIResponse(text);
            // Adiciona resposta do bot
            addMessage('bot', reply);

            // Leitura em voz alta (se ativado)
            if (ttsEnabled) {
                speakText(reply);
            }

            typingIndicator.classList.remove('show');
            isProcessing = false;
        }, delay);

        // Guardar timeout para cancelar se necessário (ex: nova sessão)
        // (opcional: para evitar vazamento, mas não crítico)
        window.__currentTimeout = timeoutId;
    }

    // ----- TEXTO PARA FALA (voz feminina) -----
    function speakText(text) {
        if (!window.speechSynthesis) return;
        // Cancela qualquer fala anterior
        if (speechSynth.speaking) speechSynth.cancel();

        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.98;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        // Tentar selecionar uma voz feminina (qualquer)
        const voices = speechSynth.getVoices();
        // Filtra vozes femininas (pistas: nome contém "female" ou "Google UK" etc.)
        let femaleVoice = voices.find(v =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('maria') ||
            v.name.toLowerCase().includes('pt') && v.name.toLowerCase().includes('female')
        );
        // fallback: primeira voz que pareça feminina ou qualquer uma
        if (!femaleVoice) {
            femaleVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0] || null;
        }
        if (femaleVoice) utterance.voice = femaleVoice;

        speechSynth.speak(utterance);
    }

    // ----- EVENT LISTENERS -----
    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Nova sessão
    newSessionBtn.addEventListener('click', createNewSession);

    // Toggle TTS
    ttsToggle.addEventListener('click', () => {
        ttsEnabled = !ttsEnabled;
        ttsToggle.classList.toggle('active', ttsEnabled);
        if (ttsEnabled) {
            // Se ativado, lê a última mensagem do bot (se houver)
            const msgs = sessions[currentSessionId] || [];
            const lastBotMsg = [...msgs].reverse().find(m => m.role === 'bot');
            if (lastBotMsg) {
                speakText(lastBotMsg.content);
            }
        } else {
            if (speechSynth.speaking) speechSynth.cancel();
        }
    });

    // Hamburguer (mobile)
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 720) {
            const isSidebar = sidebar.contains(e.target);
            const isHamburger = hamburger.contains(e.target);
            if (!isSidebar && !isHamburger && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Inicializar vozes (carregamento assíncrono)
    if (window.speechSynthesis) {
        speechSynth.getVoices(); // pré-carregar
        speechSynth.onvoiceschanged = () => {
            speechSynth.getVoices();
        };
    }

    // Inicializa a primeira sessão
    initFirstSession();

    // Extra: tratamento de erro para evitar múltiplos envios
    window.addEventListener('beforeunload', () => {
        if (speechSynth.speaking) speechSynth.cancel();
    });
});
