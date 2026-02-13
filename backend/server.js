// backend/server.js

const express = require('express');
const axios = require('axios');

const app = express();

app.use(express.json());

// Groq API credentials
const GROQ_API_URL = 'https://api.groq.com/v1';
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY'; // Replace with your actual API key

// Endpoint to handle requests
app.post('/api/groq', async (req, res) => {
    const { query, variables } = req.body;

    try {
        const response = await axios.post(`${GROQ_API_URL}/query`, {
            query,
            variables
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error communicating with Groq API:', error);
        res.status(500).json({ message: 'An error occurred while communicating with the Groq API.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
