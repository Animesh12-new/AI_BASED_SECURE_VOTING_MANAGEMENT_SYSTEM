// server/check-models.js
require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
console.log("🔍 Connecting to Google's AI Servers...");

if (!apiKey) {
    return console.log("❌ Error: Could not find GEMINI_API_KEY in your .env file!");
}

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.error) {
            console.log("\n❌ API Key Error:", parsed.error.message);
        } else {
            console.log("\n✅ SUCCESS! Google says your key is allowed to use these exact models:");
            console.log("---------------------------------------------------");
            parsed.models.forEach(m => {
                // Filter to show only Gemini models that support text generation
                if (m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`👉 "${m.name.replace('models/', '')}"`);
                }
            });
            console.log("---------------------------------------------------");
        }
    });
}).on("error", (err) => {
    console.log("❌ Network Error:", err.message);
});