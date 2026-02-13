const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Verificar variables de entorno
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HUGGING_FACE_API = process.env.HUGGING_FACE_API;

// Endpoint de prueba
app.get('/', (req, res) => {
    res.json({ message: 'CIPHER-IA Backend funcionando ✅' });
});

// Endpoint principal del chatbot
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Mensaje vacío' });
        }

        let reply;

        // Opción 1: Usa OpenAI (si tienes API key)
        if (OPENAI_API_KEY) {
            reply = await getOpenAIResponse(message);
        }
        // Opción 2: Usa Hugging Face (gratis)
        else if (HUGGING_FACE_API) {
            reply = await getHuggingFaceResponse(message);
        }
        // Opción 3: Respuesta local de fallback
        else {
            reply = getLocalResponse(message);
        }

        res.json({ reply });
    } catch (error) {
        console.error('Error en /api/chat:', error);
        res.status(500).json({ 
            error: 'Error procesando la solicitud',
            details: error.message 
        });
    }
});

// Función: Obtener respuesta de OpenAI
async function getOpenAIResponse(message) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: message }],
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error OpenAI:', error.message);
        return getLocalResponse(message);
    }
}

// Función: Obtener respuesta de Hugging Face
async function getHuggingFaceResponse(message) {
    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/gpt2',
            { inputs: message },
            {
                headers: {
                    'Authorization': `Bearer ${HUGGING_FACE_API}`
                }
            }
        );
        return response.data[0].generated_text;
    } catch (error) {
        console.error('Error Hugging Face:', error.message);
        return getLocalResponse(message);
    }
}

// Función: Respuestas locales de fallback
function getLocalResponse(message) {
    const responses = {
        'hola': '¡Hola! Soy CIPHER-IA, tu asistente IA. ¿Cómo puedo ayudarte?',
        'qué es cipher-ia': 'CIPHER-IA es un chatbot inteligente basado en IA para asistencia general.',
        'ayuda': 'Puedo ayudarte con preguntas, escritura de código, explicaciones y mucho más.',
        'código': 'Por supuesto, puedo ayudarte con cualquier lenguaje de programación.',
        'default': 'Interesante pregunta. Por favor, cuéntame más detalles para poder ayudarte mejor.'
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [key, value] of Object.entries(responses)) {
        if (key !== 'default' && lowerMessage.includes(key)) {
            return value;
        }
    }
    
    return responses.default;
}

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 CIPHER-IA Backend ejecutándose en puerto ${PORT}`);
});