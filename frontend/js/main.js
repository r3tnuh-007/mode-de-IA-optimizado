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

    // ----- CONFIGURAÇÃO DA API -----
    const API_URL = 'http://127.0.0.1:8000/perguntar';
    const HEALTH_URL = 'http://127.0.0.1:8000/health';
    let apiOnline = false;

    // ----- ESTADO -----
    let currentSessionId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    let sessions = {};          // { sessionId: [ { role, content, fontes? }, ... ] }
    let sessionOrder = [];      // lista de IDs em ordem (mais recente no final)
    let ttsEnabled = false;
    let isProcessing = false;   // evita múltiplos envios
    let speechSynth = window.speechSynthesis;
    let utterance = null;

    // ----- VERIFICAR SAÚDE DA API -----
    async function checkApiHealth() {
        try {
            const response = await fetch(HEALTH_URL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                apiOnline = true;
                console.log('✅ API online:', data);
                return true;
            } else {
                apiOnline = false;
                console.warn('⚠️ API offline:', response.status);
                return false;
            }
        } catch (error) {
            apiOnline = false;
            console.warn('⚠️ Erro ao conectar com API:', error.message);
            return false;
        }
    }

    // ----- FUNÇÃO PARA FAZER PERGUNTA À API -----
    async function fazerPergunta(pergunta) {
        if (!pergunta || pergunta.trim().length < 3) {
            return {
                erro: true,
                mensagem: "Por favor, faça uma pergunta com pelo menos 3 caracteres."
            };
        }

        try {
            const payload = {
                pergunta: pergunta.trim(),
                top_k: 3
            };

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let erroMsg = `Erro ${response.status}`;
                try {
                    const erroData = await response.json();
                    if (erroData.detail) {
                        erroMsg = erroData.detail;
                    }
                } catch (e) {
                    erroMsg = `Erro ${response.status}: ${response.statusText}`;
                }

                return {
                    erro: true,
                    mensagem: erroMsg,
                    status: response.status
                };
            }

            const data = await response.json();

            return {
                erro: false,
                pergunta: data.pergunta,
                resposta: data.resposta,
                fontes: data.fontes || [],
                dados: data
            };

        } catch (error) {
            console.error("❌ Erro na requisição:", error);
            return {
                erro: true,
                mensagem: "Erro de conexão com o servidor. Verifique se a API está rodando.",
                detalhes: error.message
            };
        }
    }

    // ----- INICIALIZAÇÃO: primeira sessão -----
    function initFirstSession() {
        sessions[currentSessionId] = [
            { role: 'bot', content: 'Olá! Como posso ajudar hoje?' }
        ];
        sessionOrder = [currentSessionId];
        renderHistory();
        renderMessages(currentSessionId);

        // Verificar saúde da API em segundo plano
        checkApiHealth();
    }

    // ----- RENDER: histórico (menu lateral) -----
    function renderHistory() {
        if (sessionOrder.length === 0) {
            historyList.innerHTML = `<li class="history-placeholder">Nenhuma conversa ainda</li>`;
            return;
        }
        let html = '';
        sessionOrder.forEach((id) => {
            const msgs = sessions[id] || [];
            const firstUserMsg = msgs.find(m => m.role === 'user');
            const preview = firstUserMsg ? firstUserMsg.content.slice(0, 40) : 'Conversa vazia';
            const isActive = (id === currentSessionId);
            const activeClass = isActive ? 'active-session' : '';
            const label = preview + (preview.length >= 40 ? '…' : '');
            html += `<li class="${activeClass}" data-session-id="${id}">${label}</li>`;
        });
        historyList.innerHTML = html;

        document.querySelectorAll('.history-list li[data-session-id]').forEach(li => {
            li.addEventListener('click', (e) => {
                const id = li.dataset.sessionId;
                if (id && id !== currentSessionId) {
                    switchSession(id);
                }
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

            // Adicionar fontes se existirem (apenas para respostas do bot)
            if (msg.role === 'bot' && msg.fontes && msg.fontes.length > 0) {
                bubble.innerHTML = `
                    ${msg.content}
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e6f0; font-size: 0.8em; color: #6c7e99;">
                        📚 Fontes: ${msg.fontes.join(', ')}
                    </div>
                `;
            } else {
                bubble.textContent = msg.content;
            }

            div.appendChild(avatar);
            div.appendChild(bubble);
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ----- MUDAR DE SESSÃO -----
    function switchSession(sessionId) {
        if (!sessions[sessionId]) return;
        currentSessionId = sessionId;
        renderHistory();
        renderMessages(currentSessionId);
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
        if (window.innerWidth <= 720) {
            sidebar.classList.remove('open');
        }
        if (speechSynth.speaking) speechSynth.cancel();
        userInput.value = '';
        typingIndicator.classList.remove('show');
        isProcessing = false;
    }

    // ----- ADICIONAR MENSAGEM -----
    function addMessage(role, content, fontes = null) {
        if (!sessions[currentSessionId]) {
            sessions[currentSessionId] = [];
        }
        const msg = { role, content };
        if (fontes) {
            msg.fontes = fontes;
        }
        sessions[currentSessionId].push(msg);
        renderMessages(currentSessionId);
        renderHistory();
    }

    // ----- ENVIAR MENSAGEM (fluxo principal com API) -----
    async function handleSend() {
        const text = userInput.value.trim();
        if (!text || isProcessing) return;

        if (!sessions[currentSessionId]) {
            sessions[currentSessionId] = [];
        }

        // Adiciona mensagem do usuário
        addMessage('user', text);
        userInput.value = '';
        isProcessing = true;
        typingIndicator.classList.add('show');

        try {
            // Verificar se a API está online
            if (!apiOnline) {
                const healthCheck = await checkApiHealth();
                if (!healthCheck) {
                    const errorMsg = "⚠️ Servidor offline. Verifique se a API está rodando em " + API_URL;
                    addMessage('bot', errorMsg);
                    typingIndicator.classList.remove('show');
                    isProcessing = false;
                    return;
                }
            }

            // Fazer a requisição para a API
            const resultado = await fazerPergunta(text);

            if (resultado.erro) {
                // Erro na resposta da API
                const errorMsg = `❌ ${resultado.mensagem}`;
                addMessage('bot', errorMsg);
            } else {
                // Sucesso - adicionar resposta com fontes
                addMessage('bot', resultado.resposta, resultado.fontes);

                // Leitura em voz alta (se ativado)
                if (ttsEnabled) {
                    speakText(resultado.resposta);
                }
            }

        } catch (error) {
            console.error('❌ Erro inesperado:', error);
            addMessage('bot', '❌ Ocorreu um erro inesperado. Por favor, tente novamente.');
        }

        typingIndicator.classList.remove('show');
        isProcessing = false;
    }

    // ----- TEXTO PARA FALA (voz feminina) -----
    function speakText(text) {
        if (!window.speechSynthesis) return;
        if (speechSynth.speaking) speechSynth.cancel();

        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.98;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        const voices = speechSynth.getVoices();
        let femaleVoice = voices.find(v =>
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('maria') ||
            v.name.toLowerCase().includes('pt') && v.name.toLowerCase().includes('female')
        );
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

    newSessionBtn.addEventListener('click', createNewSession);

    // Toggle TTS
    ttsToggle.addEventListener('click', () => {
        ttsEnabled = !ttsEnabled;
        ttsToggle.classList.toggle('active', ttsEnabled);
        if (ttsEnabled) {
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

    // Inicializar vozes
    if (window.speechSynthesis) {
        speechSynth.getVoices();
        speechSynth.onvoiceschanged = () => {
            speechSynth.getVoices();
        };
    }

    // Verificar API periodicamente (a cada 30 segundos)
    setInterval(checkApiHealth, 30000);

    // Inicializa a primeira sessão
    initFirstSession();

    // Extra: tratamento de erro para evitar múltiplos envios
    window.addEventListener('beforeunload', () => {
        if (speechSynth.speaking) speechSynth.cancel();
    });
});
