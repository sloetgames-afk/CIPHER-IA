import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyCLpi9-IwaceN0i3cZkn5VGLJX9MRfaOo0",
  authDomain: "sg-asistente.firebaseapp.com",
  databaseURL: "https://sg-asistente-default-rtdb.firebaseio.com",
  projectId: "sg-asistente",
  storageBucket: "sg-asistente.firebasestorage.app",
  messagingSenderId: "118262525208",
  appId: "1:118262525208:web:7f586b62b5ec4da351026d",
  measurementId: "G-R2B6S25786"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

window.currentUser = null;

// --- GESTIÓN DE VISTAS ---
const views = { 
    auth: document.getElementById('auth-view'), 
    app: document.getElementById('app-view'),
    settings: document.getElementById('settings-view') 
};

window.showView = (name) => { 
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    if(name === 'app') renderChatList();
};

window.switchForm = (form) => {
    document.getElementById('login-form').style.display = form === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = form === 'register' ? 'block' : 'none';
};

window.openSettings = () => {
    const config = JSON.parse(localStorage.getItem('cipher_config') || '{}');
    document.getElementById('config-name').value = config.name || '';
    document.getElementById('config-desc').value = config.desc || '';
    document.getElementById('config-tone').value = config.tone || 'balanced';
    showView('settings');
    // Cerrar sidebar en movil al abrir settings
    if(window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
    }
};

// --- AUTH ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        await loadUserData(user.uid);
        updateProfileUI();
        showView('app');
    } else {
        showView('auth');
    }
});

window.loginUser = async () => {
    const e = document.getElementById('login-email').value;
    const p = document.getElementById('login-pass').value;
    try { await signInWithEmailAndPassword(auth, e, p);
    } 
    catch (err) { document.getElementById('login-error').innerText = "Credenciales incorrectas";
    }
};

window.registerUser = async () => {
    const e = document.getElementById('reg-email').value;
    const p = document.getElementById('reg-pass').value;
    try { await createUserWithEmailAndPassword(auth, e, p);
    } 
    catch (err) { document.getElementById('login-error').innerText = "Error al registrar (mínimo 6 caracteres)";
    }
};

window.logoutUser = () => {
    saveUserDataToCloud().then(() => signOut(auth));
};

async function loadUserData(uid) {
    const dbRef = ref(database);
    try {
        const snap = await get(child(dbRef, `users/${uid}`));
        if (snap.exists()) {
            const data = snap.val();
            if(data.chats) localStorage.setItem('cipher_chats', JSON.stringify(data.chats));
            if(data.config) localStorage.setItem('cipher_config', JSON.stringify(data.config));
        }
        window.initChatApp();
    } catch(e) { console.error(e); }
}

async function saveUserDataToCloud() {
    if(!window.currentUser) return;
    const chats = JSON.parse(localStorage.getItem('cipher_chats') || '{}');
    const config = JSON.parse(localStorage.getItem('cipher_config') || '{}');
    await set(ref(database, 'users/' + window.currentUser.uid), { chats, config });
}
setInterval(saveUserDataToCloud, 5000);

window.saveSettingsAndExit = () => {
    const name = document.getElementById('config-name').value;
    const desc = document.getElementById('config-desc').value;
    const tone = document.getElementById('config-tone').value;
    localStorage.setItem('cipher_config', JSON.stringify({ name, desc, tone }));
    updateProfileUI();
    showView('app');
};

function updateProfileUI() {
    const config = JSON.parse(localStorage.getItem('cipher_config') || '{}');
    document.getElementById('sidebar-name').innerText = config.name || window.currentUser?.email?.split('@')[0] || 'Usuario';
    document.getElementById('sidebar-desc').innerText = config.desc || 'Configurar perfil';
}

// --- CONFIGURACIÓN MARKED.JS ---
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const safeCode = String(code || '');
    const lang = (language || 'TEXTO').toUpperCase();
    const randomId = 'code-' + Math.random().toString(36).substr(2, 9);
    return `
    <div class="code-block-wrapper">
        <div class="code-header">
            <span>${lang}</span>
            <button class="code-copy-btn" onclick="copyCode(this)">
                <i class="fas fa-copy"></i> 
                Copiar
            </button>
        </div>
        <pre><code class="language-${language}">${safeCode}</code></pre>
        <textarea id="${randomId}" style="display:none">${safeCode}</textarea>
    </div>`;
};
marked.setOptions({ renderer: renderer });

window.copyCode = function(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const codeText = wrapper.querySelector('textarea').value;
    navigator.clipboard.writeText(codeText).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
        setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
    });
};

// --- SISTEMA DE GESTIÓN DE APIS Y CHAT ---
const apiKeys = [
    "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", 
    "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",
    "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", 
    "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"
];

let currentKeyIndex = 0;
let allChats = {};
let currentChatId = null;
let fileContent = null;
let contextTargetChatId = null;
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');

window.initChatApp = function() {
    allChats = JSON.parse(localStorage.getItem('cipher_chats') || '{}');
    renderChatList();
    if(Object.keys(allChats).length > 0) {
        const lastId = Object.keys(allChats).pop();
        loadChat(lastId);
    } else {
        triggerNewChat();
    }
};

window.triggerNewChat = function() {
    currentChatId = 'chat_' + Date.now();
    chatContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80%; color:#666; text-align:center;">
            <div style="background:rgba(255,255,255,0.05); padding:25px; border-radius:50%; margin-bottom:20px;">
                <i class="fas fa-bolt" style="font-size:35px; color:var(--text-primary);"></i>
            </div>
            <h2 style="color:var(--text-primary); margin-bottom: 5px;">CIPHER IA</h2>
            <p style="font-size:14px;">¿En qué puedo ayudarte hoy?</p>
        </div>`;
    document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
    
    // Cerrar menú móvil al crear nuevo chat
    if(window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
    }
};

window.loadChat = function(id) {
    currentChatId = id;
    const chat = allChats[id];
    if(!chat) return;

    chatContainer.innerHTML = '';
    chat.messages.forEach(msg => renderMessageHTML(msg.text, msg.sender));
    
    renderChatList();
    if(window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
    }
    setTimeout(() => chatContainer.scrollTop = chatContainer.scrollHeight, 10);
};

function renderMessageHTML(text, sender) {
    const isAI = sender === 'ai';
    const rowClass = isAI ? 'ai-row' : 'user-row';
    if(chatContainer.innerHTML.includes('fa-bolt')) chatContainer.innerHTML = '';
    
    let safeText = (typeof text === 'string') ? text : JSON.stringify(text);
    let parsedText = safeText;
    try { parsedText = marked.parse(safeText); } catch(e) { console.error(e); }

    const html = `<div class="message-row ${rowClass}"><div class="message-content">${parsedText}</div></div>`;
    chatContainer.insertAdjacentHTML('beforeend', html);
    setTimeout(() => chatContainer.scrollTop = chatContainer.scrollHeight, 50);
}

window.handleSend = async function() {
    const text = userInput.value.trim();
    if(!text && !fileContent) return;
    
    if(!allChats[currentChatId]) {
        allChats[currentChatId] = { title: 'Nuevo Chat', messages: [], msgCount: 0, cooldownStart: 0 };
    }
    
    // Lógica de límites
    const chat = allChats[currentChatId];
    if (!chat.msgCount) chat.msgCount = 0;
    if (!chat.cooldownStart) chat.cooldownStart = 0;
    if (chat.cooldownStart > 0) {
        const elapsed = Date.now() - chat.cooldownStart;
        const cooldownTime = 20 * 60 * 1000;
        if (elapsed < cooldownTime) {
            const remaining = Math.ceil((cooldownTime - elapsed) / 60000);
            renderMessageHTML(`⚠️ **CHAT PAUSADO**: Límite alcanzado. Espera ${remaining} minutos.`, "ai");
            return;
        } else {
            chat.cooldownStart = 0;
            chat.msgCount = 0;
        }
    }
    chat.msgCount++;
    if (chat.msgCount > 20) {
        chat.cooldownStart = Date.now();
        renderMessageHTML("🛑 Has enviado 20 mensajes. Pausa de 20 min iniciada.", "ai");
        saveChatsLocally();
        return;
    }

    let fullMsg = text;
    if(fileContent) {
        fullMsg += `\n\n[ARCHIVO: ${document.getElementById('file-name-display').innerText}]\n\`\`\`\n${fileContent}\n\`\`\``;
        clearFile();
    }

    userInput.value = '';
    userInput.style.height = 'auto';
    allChats[currentChatId].messages.push({ text: fullMsg, sender: 'user' });
    renderMessageHTML(fullMsg, 'user');
    saveChatsLocally();
    renderChatList();

    const loadingId = 'loading-' + Date.now();
    const loadingHTML = `
    <div class="message-row ai-row" id="${loadingId}">
        <div class="message-content" style="padding: 10px 18px;">
            <div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        </div>
    </div>`;
    chatContainer.insertAdjacentHTML('beforeend', loadingHTML);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const config = JSON.parse(localStorage.getItem('cipher_config') || '{}');
    let systemPrompt = "Eres CIPHER. Responde de forma útil y profesional. Usa MARKDOWN.";
    if (config.tone === 'programmer') systemPrompt = "Eres Programador Senior. Código experto.";
    else if (config.tone === 'serious') systemPrompt = "Eres un experto técnico. Respuestas formales.";
    else if (config.tone === 'friendly') systemPrompt = "Eres un asistente amigable.";

    let success = false;
    let attempts = 0;
    let finalErrorMsg = "Error desconocido.";

    while (!success && attempts < apiKeys.length) {
        const apiKey = apiKeys[currentKeyIndex];
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...allChats[currentChatId].messages.map(m => ({ 
                            role: m.sender === 'user' ? 'user' : 'assistant', 
                            content: typeof m.text === 'string' ? m.text : String(m.text)
                        })).slice(-8)
                    ],
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiText = data.choices[0].message.content;
                document.getElementById(loadingId)?.remove();
                allChats[currentChatId].messages.push({ text: aiText, sender: 'ai' });
                if(allChats[currentChatId].messages.length === 2) {
                    let newTitle = allChats[currentChatId].messages[0].text.substring(0, 25);
                    if(newTitle.length >= 25) newTitle += "...";
                    allChats[currentChatId].title = newTitle;
                    renderChatList();
                }
                renderMessageHTML(aiText, 'ai');
                saveChatsLocally();
                success = true;
            } else {
                if (response.status === 401 || response.status === 429 || response.status === 403) {
                    console.warn(`Key ${currentKeyIndex} falló. Rotando...`);
                    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                    attempts++;
                } else {
                    throw new Error(`Error ${response.status}`);
                }
            }
        } catch (error) {
            attempts++;
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            if (attempts >= apiKeys.length) finalErrorMsg = "⚠️ **Error**: Servidores ocupados.";
        }
    }

    if (!success) {
        document.getElementById(loadingId)?.remove();
        renderMessageHTML(finalErrorMsg, "ai");
    }
};

window.renderChatList = function() {
    const list = document.getElementById('chat-history-list');
    list.innerHTML = '';
    Object.keys(allChats).reverse().forEach(id => {
        const chat = allChats[id];
        const div = document.createElement('div');
        div.className = 'chat-list-item ' + (id === currentChatId ? 'active' : '');
        div.innerHTML = `<i class="far fa-message"></i> ${chat.title}`;
        div.onclick = () => loadChat(id);
        div.oncontextmenu = (e) => showContextMenu(e, id);
        let pressTimer;
        div.ontouchstart = (e) => { pressTimer = setTimeout(() => showContextMenu(e, id), 800); }
        div.ontouchend = () => clearTimeout(pressTimer);
        list.appendChild(div);
    });
};

const ctxMenu = document.getElementById('ctx-menu');
function showContextMenu(e, id) {
    e.preventDefault();
    contextTargetChatId = id;
    let x = e.clientX || e.touches[0].clientX;
    let y = e.clientY || e.touches[0].clientY;
    // Ajuste para que no se salga de pantalla
    if (x + 160 > window.innerWidth) x = window.innerWidth - 170;
    ctxMenu.style.top = y + 'px';
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.display = 'block';
}
document.addEventListener('click', (e) => { if(!ctxMenu.contains(e.target)) ctxMenu.style.display = 'none'; });

window.renameChatAction = () => {
    const newTitle = prompt("Nuevo nombre:", allChats[contextTargetChatId].title);
    if(newTitle) {
        allChats[contextTargetChatId].title = newTitle;
        saveChatsLocally();
        renderChatList();
    }
    ctxMenu.style.display = 'none';
};

window.deleteChatAction = () => {
    if(confirm("¿Eliminar chat?")) {
        delete allChats[contextTargetChatId];
        saveChatsLocally();
        if(contextTargetChatId === currentChatId) triggerNewChat();
        else renderChatList();
    }
    ctxMenu.style.display = 'none';
};

window.saveChatsLocally = () => localStorage.setItem('cipher_chats', JSON.stringify(allChats));

userInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
userInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.handleSend(); } });
document.getElementById('send-btn').addEventListener('click', window.handleSend);

// --- SIDEBAR TOGGLE MEJORADO ---
window.toggleSidebar = () => {
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sb.classList.toggle('open');
    overlay.classList.toggle('visible');
};

window.handleFileSelect = (input) => {
    if(input.files && input.files[0]) {
        const file = input.files[0];
        if (file.type.startsWith('text/') || file.name.match(/\.(js|py|html|css|json|md|csv)$/i)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileContent = e.target.result;
                document.getElementById('file-preview-area').style.display = 'flex';
                document.getElementById('file-name-display').innerText = file.name;
            };
            reader.readAsText(file);
        } else {
            alert("Solo archivos de texto/código.");
            input.value = '';
        }
    }
};

window.clearFile = () => {
    fileContent = null;
    document.getElementById('file-upload').value = '';
    document.getElementById('file-preview-area').style.display = 'none';
}
