const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para procesar JSON y servir archivos estáticos (frontend)
app.use(express.json());
app.use(express.static('public'));

// Endpoint API que conecta con Groq
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    // Obtenemos la key de las variables de entorno de Railway
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "API Key no configurada en el servidor" });
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Eres Cipher IA, un asistente inteligente, directo y servicial. Respondes en español. No uses emojis excesivamente." },
                    { role: "user", content: message }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.6,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error de Groq:", errorData);
            return res.status(response.status).json({ error: "Error en la IA" });
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || "";
        res.json({ reply });

    } catch (error) {
        console.error("Error del servidor:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
