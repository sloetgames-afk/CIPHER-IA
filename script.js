// --- CONFIGURACIÓN ---

/**
 * DETERMINACIÓN DE LA URL DEL BACKEND
 * * Lógica:
 * 1. Si el navegador está en 'localhost', asume que el backend está en el puerto 5000.
 * 2. Si está en producción (Railway), usa una ruta relativa (si sirves el HTML desde el mismo server)
 * o la URL completa de producción.
 */

// Define aquí la ruta de tu endpoint (ej: "/chat", "/api/message" o simplemente "/")
const API_ENDPOINT = "/chat"; 

let BACKEND_URL;

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    // Entorno Local: Apunta explícitamente al puerto 5000
    BACKEND_URL = `http://localhost:5000${API_ENDPOINT}`;
} else {
    // Entorno Producción (Railway):
    // Opción A: Si tu backend Node/Python SIRVE este archivo HTML, usa ruta relativa:
    BACKEND_URL = API_ENDPOINT; 
    
    // Opción B: Si tu frontend está separado (ej: Vercel) y conecta al backend en Railway:
    // BACKEND_URL = `https://cipher-ia-production.up.railway.app${API_ENDPOINT}`;
}

console.log("Conectando a:", BACKEND_URL);

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
    userInput.style.height = 'auto'; 
    isProcessing = true;
    sendBtn.disabled = true;

    // UI de carga
    const loadingId = addLoading();
    scrollToBottom();

    // Llamada al Backend
    const responseText = await fetchFromBackend(text);

    // Resultado
    removeMessage(loadingId);
    if (responseText) {
        addMessage(responseText, 'ai');
    } else {
        addMessage("Error de conexión. Verifica que el servidor (puerto 5000) esté corriendo.", 'ai', true);
    }

    isProcessing = false;
    sendBtn.disabled = false;
    // Auto-focus para seguir escribiendo
    userInput.focus(); 
}

async function fetchFromBackend(prompt) {
    try {
        const payload = {
            // Ajusta esto según lo que espere tu servidor (OpenAI format o prompt simple)
            messages: [
                { role: "system", content: "Eres Cipher IA, un asistente inteligente y útil." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile" 
        };

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        const data = await response.json();
        
        // ADVERTENCIA: Verifica aquí la estructura exacta de tu respuesta JSON
        return data.content || data.reply || data.choices?.[0]?.message?.content || "";

    } catch (error) {
        console.error("Error al conectar con el Backend:", error);
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
        // Logo fallback
        const imgTag = `<img src="cipheria.png" class="logo-avatar" onerror="this.style.display='none'">`;
        
        const htmlContent = isError 
            ? `<span style="color:#ef4444">${content}</span>` 
            : marked.parse(content);

        row.innerHTML = `
            <div class="ai-avatar">
                ${imgTag}
                <i class="fas fa-robot fallback-icon" style="display:none"></i>
            </div>
            <div class="bubble ai-bubble markdown-body">${htmlContent}</div>
        `;
        
        // Manejo simple de imagen rota para mostrar ícono
        const img = row.querySelector('.logo-avatar');
        if(img) {
            img.onerror = function() {
                this.style.display = 'none';
                row.querySelector('.fallback-icon').style.display = 'block';
            }
        }
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
        <div class="ai-avatar"><i class="fas fa-robot"></i></div>
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

userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

sendBtn.addEventListener('click', handleSend);
