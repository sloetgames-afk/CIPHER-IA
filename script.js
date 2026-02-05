// --- CONFIGURACIÓN ---
// Pega aquí la URL pública de tu servicio en Railway
// Ejemplo: "https://mi-proyecto-cipher.up.railway.app/chat"
const BACKEND_URL = "https://cipher-ia-production.up.railway.app"; 

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

    // Llamada a TU Backend (Railway)
    const responseText = await fetchFromBackend(text);

    // Resultado
    removeMessage(loadingId);
    if (responseText) {
        addMessage(responseText, 'ai');
    } else {
        addMessage("Error de conexión con el servidor. Intenta más tarde.", 'ai', true);
    }

    isProcessing = false;
    sendBtn.disabled = false;
}

async function fetchFromBackend(prompt) {
    try {
        // NOTA: La estructura del 'body' depende de cómo programaste tu backend en Railway.
        // Opción A: Si tu backend espera solo el mensaje del usuario:
        /*
        const payload = { prompt: prompt };
        */

        // Opción B: Si tu backend actúa como proxy directo y espera el array de mensajes completo:
        const payload = {
            messages: [
                { role: "system", content: "Eres Cipher IA, un asistente inteligente, directo y servicial. Respondes en español. No uses emojis excesivamente." },
                { role: "user", content: prompt }
            ],
            // Si tu backend permite configurar modelo/temperatura, agrégalos aquí,
            // si no, quítalos y deja que el backend los maneje.
            model: "llama-3.3-70b-versatile" 
        };

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
                // No enviamos Authorization aquí, eso lo hace el backend
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        const data = await response.json();
        
        // Ajusta esto según lo que devuelva tu backend.
        // Ejemplo: data.content, data.reply, data.choices[0].message.content, etc.
        return data.content || data.reply || data.choices?.[0]?.message?.content || "";

    } catch (error) {
        console.error("Error al conectar con Railway:", error);
        return null;
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
