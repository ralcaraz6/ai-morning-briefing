require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Parser = require('rss-parser');
const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Perplexity API configuration
const PERPLEXITY_API_KEY = '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// RSS Parser instance
const parser = new Parser();

// Store user profile and preferences
let userProfile = {
    age: 28,
    location: "Barcelona",
    job: "Analista de datos",
    company: "Empresa tecnológica alemana",
    interests: ["nuevas leyes", "productos digitales", "software", "inteligencia artificial", "conflictos geopolíticos", "inversiones personales"],
    notInterested: ["deportes", "farándula", "casamientos", "rondas de inversión", "adquisiciones empresariales", "acuerdos internacionales sin efecto en España"]
};

// RSS Sources
const rssSources = [
    {
        id: 1,
        name: "El País",
        url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
        category: "General",
        active: true
    },
    {
        id: 2,
        name: "El Mundo",
        url: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
        category: "General",
        active: true
    },
    {
        id: 3,
        name: "La Vanguardia",
        url: "https://www.lavanguardia.com/rss/home.xml",
        category: "General",
        active: true
    },
    {
        id: 4,
        name: "Expansión",
        url: "https://e00-expansion.uecdn.es/rss/portada.xml",
        category: "Economía",
        active: true
    }
];

// Configuración de email (rellena tu email y usa una contraseña de aplicación de Gmail)
const EMAIL_USER = 'ralcaraz.canals@gmail.com';
const EMAIL_PASS = process.env.GMAIL_APP_PASSWORD || 'TU_CONTRASEÑA_DE_APP'; // Usa variable de entorno para seguridad
const EMAIL_TO = 'ralcaraz.canals@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Newsletter recipients (in-memory for now)
let newsletterRecipients = [EMAIL_TO];

// API to get recipients
app.get('/api/recipients', (req, res) => {
    res.json(newsletterRecipients);
});
// API to add a recipient
app.post('/api/recipients', (req, res) => {
    const { email } = req.body;
    if (email && !newsletterRecipients.includes(email)) {
        newsletterRecipients.push(email);
        res.json({ success: true, recipients: newsletterRecipients });
    } else {
        res.status(400).json({ success: false, message: 'Invalid or duplicate email' });
    }
});
// API to remove a recipient
app.delete('/api/recipients', (req, res) => {
    const { email } = req.body;
    newsletterRecipients = newsletterRecipients.filter(e => e !== email);
    res.json({ success: true, recipients: newsletterRecipients });
});

function generateNewsletterHTML(news) {
    // Only relevant news (relevance >= 60)
    const relevantNews = news.filter(n => n.relevanceScore >= 60);
    const currentDate = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    // Recap section
    const recap = `
      <div style="margin-bottom:18px;">
        <strong>Profile:</strong> ${userProfile.job}, ${userProfile.age} years old, ${userProfile.location}, ${userProfile.company}<br>
        <strong>Interests:</strong> ${userProfile.interests.join(', ')}<br>
        <strong>Not interested in:</strong> ${userProfile.notInterested.join(', ')}<br>
        <strong>Filters:</strong> Relevance ≥ 60%
      </div>
    `;
    return `
      <h2>🌅 Your Personalized Morning Briefing</h2>
      <p><strong>${currentDate}</strong></p>
      ${recap}
      <ul>
        ${relevantNews.map(n => `
          <li style="margin-bottom:18px;">
            <a href="${n.url}" target="_blank" style="font-size:1.1em;font-weight:bold;">${n.title}</a><br>
            <span style="color:#888;">${n.source} | ${n.category || ''} | ${new Date(n.publishedAt).toLocaleString('es-ES', {hour:'2-digit',minute:'2-digit'})}</span><br>
            <span>${n.summary}</span><br>
            <span style="color:#0a7c4a;">${n.impact}</span>
          </li>
        `).join('')}
      </ul>
      <p style="font-size:0.9em;color:#888;">Newsletter generated automatically by AI Morning Briefing.</p>
    `;
}

// Update manual endpoint to use all recipients
app.post('/api/send-newsletter-now', async (req, res) => {
    try {
        const news = await fetchAndProcessNews();
        const html = generateNewsletterHTML(news);
        await transporter.sendMail({
            from: `AI Morning Briefing <${EMAIL_USER}>`,
            to: newsletterRecipients.join(','),
            subject: '📰 Your AI Morning Briefing (Manual Test)',
            html
        });
        res.json({ success: true, message: 'Newsletter sent to all recipients!' });
    } catch (err) {
        console.error('Error sending manual newsletter:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Analyze news relevance using Perplexity API
async function analyzeNewsRelevance(news, userProfile) {
    try {
        const prompt = `
Eres un asistente experto en personalización de noticias. Analiza la siguiente noticia para este usuario:
Edad: ${userProfile.age}
Ubicación: ${userProfile.location}
Trabajo: ${userProfile.job}
Intereses: ${userProfile.interests.join(', ')}
No le interesa: ${userProfile.notInterested.join(', ')}
Título: ${news.title}
Resumen: ${news.summary}

Devuelve SOLO un JSON con:
relevanceScore (0-100), impact (breve explicación), category (Tecnología, Economía, Laboral, Tecnología Local, General)
`;
        const response = await axios.post(PERPLEXITY_API_URL, {
            model: "sonar-pro",
            messages: [{ role: "user", content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        // Intentar parsear la respuesta
        try {
            return JSON.parse(response.data.choices[0].message.content);
        } catch (parseError) {
            console.error('Error parsing Perplexity response:', response.data.choices[0].message.content);
            return {
                relevanceScore: 0,
                impact: `Error parsing Perplexity response: ${response.data.choices[0].message.content}`,
                category: news.category || "General"
            };
        }
    } catch (error) {
        // Mostrar el error real de Perplexity
        let errorMsg = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        console.error('Error analyzing news:', errorMsg);
        return {
            relevanceScore: 0,
            impact: `Error Perplexity: ${errorMsg}`,
            category: news.category || "General"
        };
    }
}

// Fetch and process RSS feeds
async function fetchAndProcessNews() {
    let allNews = [];
    
    for (const source of rssSources.filter(s => s.active)) {
        try {
            const feed = await parser.parseURL(source.url);
            const newsItems = feed.items.slice(0, 5).map(item => ({
                title: item.title,
                summary: item.contentSnippet || item.content,
                source: source.name,
                url: item.link,
                publishedAt: item.pubDate,
                category: source.category
            }));
            
            allNews = [...allNews, ...newsItems];
        } catch (error) {
            console.error(`Error fetching ${source.name}:`, error);
        }
    }
    
    // Analyze each news item with Perplexity
    const analyzedNews = await Promise.all(
        allNews.map(async (news) => {
            const analysis = await analyzeNewsRelevance(news, userProfile);
            return {
                ...news,
                relevanceScore: analysis.relevanceScore,
                impact: analysis.impact,
                category: analysis.category
            };
        })
    );
    
    return analyzedNews;
}

// API Endpoints
app.get('/api/news', async (req, res) => {
    try {
        const news = await fetchAndProcessNews();
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching news' });
    }
});

app.get('/api/profile', (req, res) => {
    res.json(userProfile);
});

app.post('/api/profile', (req, res) => {
    userProfile = { ...userProfile, ...req.body };
    res.json(userProfile);
});

app.get('/api/sources', (req, res) => {
    res.json(rssSources);
});

app.post('/api/sources', (req, res) => {
    const newSource = {
        id: Math.max(...rssSources.map(s => s.id)) + 1,
        ...req.body,
        active: true
    };
    rssSources.push(newSource);
    res.json(newSource);
});

app.put('/api/sources/:id', (req, res) => {
    const source = rssSources.find(s => s.id === parseInt(req.params.id));
    if (source) {
        Object.assign(source, req.body);
        res.json(source);
    } else {
        res.status(404).json({ error: 'Source not found' });
    }
});

app.delete('/api/sources/:id', (req, res) => {
    const index = rssSources.findIndex(s => s.id === parseInt(req.params.id));
    if (index !== -1) {
        rssSources.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Source not found' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 