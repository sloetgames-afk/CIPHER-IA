let currentKeyIndex = 0;
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
let isProcessing = false;

// Configuración de Markdown (Marked)
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const lang = language || 'texto';
    return `
    <div class="code-block">
        <div class="code-header">
            <span>${lang}</span>
            <button class="copy-btn" onclick="copyToClipboard(this)">
                <i class="far fa-copy"></i>
            </button>
        </div>
        <pre><code class="language-${lang}">${code}</code></pre>
    </div>`;
};
marked.setOptions({ renderer: renderer, breaks: true });

// --- LÓGICA DEL CHAT ---

async function handleSend() {
    const text = userInput.value.trim();
    if (!text || isProcessing) return;

    // UI del usuario
    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto'; // Reset altura
    isProcessing = true;
    sendBtn.disabled = true;

    // UI de carga
    const loadingId = addLoading();
    scrollToBottom();

    // Llamada API
    const responseText = await fetchWithRetry(text);

    // Resultado
    removeMessage(loadingId);
    if (responseText) {
        addMessage(responseText, 'ai');
    } else {
        addMessage("No se pudo conectar. Verifica tu internet o las claves API.", 'ai', true);
    }

    isProcessing = false;
    sendBtn.disabled = false;
    // Enfocar de nuevo en PC, opcional en móvil
    // userInput.focus();
}

async function fetchWithRetry(prompt, attempt = 0) {
    if (attempt >= apiKeys.length) return null; // Todas fallaron

    const apiKey = apiKeys[currentKeyIndex];
    
    try {
        // Usamos el modelo "llama-3.3-70b-versatile" que es muy estable en Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Eres Cipher IA, un asistente inteligente, directo y servicial. Respondes en español. No uses emojis excesivamente." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile", 
                temperature: 0.6,
                max_tokens: 1024
            })
        });

        if (!response.ok) throw new Error(response.status);

        const data = await response.json();
        return data.choices[0]?.message?.content || "";

    } catch (error) {
        console.warn(`Intento ${attempt + 1} fallido con Key ${currentKeyIndex}. Error: ${error.message}`);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length; // Rotar clave
        return await fetchWithRetry(prompt, attempt + 1); // Reintentar
    }
}

// --- FUNCIONES VISUALES ---

function addMessage(content, role, isError = false) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user-row' : 'ai-row'}`;
    
    if (role === 'user') {
        row.innerHTML = `<div class="bubble user-bubble">${escapeHtml(content)}</div>`;
    } else {
        // Logo fallback lógico
        const imgTag = `<img src="cipheria.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712027.png'">`;
        
        const htmlContent = isError 
            ? `<span style="color:#ef4444">${content}</span>` 
            : marked.parse(content);

        row.innerHTML = `
            <div class="ai-avatar">${imgTag}</div>
            <div class="bubble ai-bubble markdown-body">${htmlContent}</div>
        `;
    }
    chatContainer.appendChild(row);
    scrollToBottom();
}

function addLoading() {
    const id = 'loading-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="ai-avatar"><img src="cipheria.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712027.png'"></div>
        <div class="bubble ai-bubble">
            <div class="typing-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        </div>
    `;
    chatContainer.appendChild(row);
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// --- UTILIDADES ---

window.copyToClipboard = function(btn) {
    const wrapper = btn.closest('.code-block');
    const code = wrapper.querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const icon = btn.querySelector('i');
        icon.className = 'fas fa-check';
        setTimeout(() => icon.className = 'far fa-copy', 2000);
    });
};

// Ajuste automático de altura del textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Enviar con Enter (pero Shift+Enter hace salto de línea)
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

sendBtn.addEventListener('click', handleSend);

// Control de logo en header
const logoImg = document.querySelector('.logo-img');
const mainTitle = document.getElementById('main-title');
if(logoImg) {
    logoImg.onload = function() { mainTitle.style.display = 'none'; };
    logoImg.onerror = function() { 
        this.style.display = 'none'; 
        document.getElementById('txt-logo').style.display = 'block';
        mainTitle.style.display = 'none';
    };
}
