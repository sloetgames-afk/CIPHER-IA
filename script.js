const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
let isProcessing = false;

// Configuración de Markdown
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

async function handleSend() {
    const text = userInput.value.trim();
    if (!text || isProcessing) return;

    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    isProcessing = true;
    sendBtn.disabled = true;

    const loadingId = addLoading();
    scrollToBottom();

    // --- CAMBIO PRINCIPAL: Petición a nuestro backend en Railway ---
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) throw new Error("Error en el servidor");

        const data = await response.json();
        removeMessage(loadingId);
        
        if (data.reply) {
            addMessage(data.reply, 'ai');
        } else {
            addMessage("Respuesta vacía del servidor.", 'ai', true);
        }

    } catch (error) {
        removeMessage(loadingId);
        addMessage("No se pudo conectar con el servidor.", 'ai', true);
        console.error(error);
    }

    isProcessing = false;
    sendBtn.disabled = false;
}

// --- Funciones de UI (Iguales al original) ---

function addMessage(content, role, isError = false) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user-row' : 'ai-row'}`;
    
    if (role === 'user') {
        row.innerHTML = `<div class="bubble user-bubble">${escapeHtml(content)}</div>`;
    } else {
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

// Control de logo en header
const logoImg = document.querySelector('.logo-img');
const mainTitle = document.getElementById('main-title');
if(logoImg) {
    logoImg.onload = function() { if(mainTitle) mainTitle.style.display = 'none'; };
    logoImg.onerror = function() { 
        this.style.display = 'none'; 
        const txtLogo = document.getElementById('txt-logo');
        if(txtLogo) txtLogo.style.display = 'block';
        if(mainTitle) mainTitle.style.display = 'none';
    };
}
