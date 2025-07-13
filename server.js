console.log("👋 Script started...");

const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🧪 Test endpoint
app.get('/', (req, res) => {
  res.send('✅ CMA API is running!');
});

// 📬 POST /scrape — receives property details
app.post('/scrape', async (req, res) => {
  const { address, zip, bedrooms, bathrooms, sqft } = req.body;

  // Validate input
  if (!zip || !bedrooms || !bathrooms || !sqft) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // 🚀 Launch Puppeteer with safe Render flags
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();

    const zillowURL = `https://www.zillow.com/homes/for_rent/${zip}/?beds=${bedrooms}&baths=${bathrooms}`;
    console.log(`🔗 Navigating to: ${zillowURL}`);

    await page.goto(zillowURL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scrape comps
    const comps = await page.evaluate(() => {
      const listings = [];
      document.querySelectorAll('[data-testid="property-card"]').forEach(card => {
        const title = card.querySelector('[data-testid="property-card-title"]')?.innerText || "";
        const price = card.querySelector('[data-testid="property-card-price"]')?.innerText || "";
        const details = card.querySelector('[data-testid="property-card-meta"]')?.innerText || "";
        const image = card.querySelector('img')?.src || "";
        const link = card.querySelector('a')?.href || "";

        listings.push({ title, price, details, image, link });
      });
      return listings.slice(0, 5); // Limit to 5 comps
    });

    await browser.close();

    res.json({
      subjectProperty: { address, zip, bedrooms, bathrooms, sqft },
      comps,
      recommendation: `Based on ${comps.length} comps in ${zip}, a fair market rent is approximately $X/month.` // GPT can refine this later
    });

  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    res.status(500).json({ error: 'Scraping failed.' });
  }
});

// 🌐 Start server
app.listen(PORT, () => {
  console.log(`✅ Server is listening on http://localhost:${PORT}`);
});