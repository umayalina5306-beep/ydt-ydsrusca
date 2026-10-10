// Ziyaretçinin IP ve yaklaşık konumu (Vercel'in kendi başlıklarından; dış servis gerekmez).
// Site bunu hata kayıtlarında ve giriş kayıtlarında şehir/ülke bilgisi için kullanır.
module.exports = (req, res) => {
  const h = req.headers || {};
  const coz = (v) => { try { return decodeURIComponent(String(v || '')); } catch (e) { return String(v || ''); } };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  res.end(JSON.stringify({
    ip: String(h['x-real-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim(),
    city: coz(h['x-vercel-ip-city']),
    region: coz(h['x-vercel-ip-country-region']),
    country: String(h['x-vercel-ip-country'] || '')
  }));
};
