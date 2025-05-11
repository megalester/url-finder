const express = require('express');
const fetch = require('node-fetch');
const dns = require('dns').promises;
const app = express();

app.use(express.static('public'));

const possibleSubdomains = ['mail', 'webmail', 'email', 'portal', 'login', 'web'];

async function checkURLStatus(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return { url, status: res.status };
  } catch (err) {
    return { url, status: 'unreachable' };
  }
}

app.get('/lookup', async (req, res) => {
  const email = req.query.email;
  if (!email || !email.includes('@')) {
    return res.json({ error: 'Invalid email' });
  }

  const domain = email.split('@')[1].toLowerCase();
  let results = [];

  // Scan common subdomain patterns
  for (const sub of possibleSubdomains) {
    const url = `https://${sub}.${domain}`;
    results.push(await checkURLStatus(url));
  }

  // Also try the base domain directly
  results.push(await checkURLStatus(`https://${domain}`));

  // Also try MX records
  try {
    const mxRecords = await dns.resolveMx(domain);
    const mxHosts = mxRecords.map(mx => mx.exchange);
    for (const mx of mxHosts) {
      const url = `https://${mx}`;
      results.push(await checkURLStatus(url));
    }
  } catch (err) {
    results.push({ info: 'No MX records found or DNS error' });
  }

  res.json({ domain, loginPages: results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
