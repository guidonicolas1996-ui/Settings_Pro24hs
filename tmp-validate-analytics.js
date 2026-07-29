const https = require('https');
const key = 'AIzaSyCSaDOHnY6J7ZHZrME_Byt0_Xiqq6DvejA';
const baseUrl = `https://firestore.googleapis.com/v1/projects/futurevip-bde42/databases/(default)/documents/analytics?key=${key}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function haveField(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, key)) {
      return false;
    }
    cur = cur[key];
  }
  return cur != null;
}

function value(field) {
  if (!field) return null;
  if (field.integerValue != null) return Number(field.integerValue);
  if (field.doubleValue != null) return Number(field.doubleValue);
  if (field.stringValue != null) return field.stringValue;
  if (field.booleanValue != null) return field.booleanValue;
  return null;
}

(async () => {
  let url = baseUrl;
  const docs = [];
  while (url) {
    const data = await getJson(url);
    if (data.documents) {
      docs.push(...data.documents);
    }
    if (data.nextPageToken) {
      url = `${baseUrl}&pageToken=${encodeURIComponent(data.nextPageToken)}`;
    } else {
      url = null;
    }
  }
  const sessions = docs.filter((doc) => doc.name && doc.name.includes('/landing_session_'));
  const parsed = sessions.map((doc) => {
    const f = doc.fields || {};
    return {
      id: doc.name || 'unknown',
      visitStart: value(f.visitStart),
      visitStartMs: value(f.visitStartMs),
      landingReady: haveField(f, ['landingReady']),
      heroVisible: haveField(f, ['behavior', 'mapValue', 'fields', 'hero']),
      ctaVisible: haveField(f, ['behavior', 'mapValue', 'fields', 'buttonVisible']),
      whatsappClick: haveField(f, ['behavior', 'mapValue', 'fields', 'whatsappClick']),
      buttonReadyMs: value(f.buttonReady?.mapValue?.fields?.readyAtMs) || value(f.landingReady?.mapValue?.fields?.buttonReadyMs),
      fcp: value(f.performance?.mapValue?.fields?.fcp),
      lcp: value(f.performance?.mapValue?.fields?.lcp),
      cls: value(f.performance?.mapValue?.fields?.cls),
      inp: value(f.performance?.mapValue?.fields?.inp),
      ttfb: value(f.performance?.mapValue?.fields?.ttfb),
      source: value(f.source) || 'unknown',
      device: value(f.landingReady?.mapValue?.fields?.device) || 'unknown',
      connection: value(f.landingReady?.mapValue?.fields?.connection?.mapValue?.fields?.effectiveType) || value(f.landingReady?.mapValue?.fields?.connection?.mapValue?.fields?.type) || 'unknown'
    };
  });
  parsed.sort((a, b) => (a.visitStartMs || 0) - (b.visitStartMs || 0));
  const total = parsed.length;
  const counts = {
    total,
    landingReady: parsed.filter((s) => s.landingReady).length,
    heroVisible: parsed.filter((s) => s.heroVisible).length,
    ctaVisible: parsed.filter((s) => s.ctaVisible).length,
    whatsapp: parsed.filter((s) => s.whatsappClick).length,
    clicked: parsed.filter((s) => s.whatsappClick).length,
    notClicked: parsed.filter((s) => !s.whatsappClick).length,
  };
  const earliest = parsed[0]?.visitStart || null;
  const latest = parsed[parsed.length - 1]?.visitStart || null;
  console.log(JSON.stringify({ counts, earliest, latest, sample: parsed.slice(0, 3) }, null, 2));
})();
