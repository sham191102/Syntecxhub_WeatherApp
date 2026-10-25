import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3001;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING = 'https://geocoding-api.open-meteo.com/v1';

app.use(cors());
app.use(express.json());

function coordinatesFrom(query) {
  const latitude = Number(query.latitude);
  const longitude = Number(query.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

async function proxyJson(url, res) {
  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: 'Weather provider request failed.' });
    return res.json(await response.json());
  } catch {
    return res.status(502).json({ error: 'Could not connect to the weather provider.' });
  }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'weatherly-api' }));

app.get('/api/weather', async (req, res) => {
  const coordinates = coordinatesFrom(req.query);
  if (!coordinates) return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  const temperatureUnit = req.query.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(coordinates).map(([key, value]) => [key, String(value)])),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    hourly: 'temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    temperature_unit: temperatureUnit,
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '24',
  });
  return proxyJson(`${OPEN_METEO_FORECAST}?${params}`, res);
});

app.get('/api/geocode', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name || name.length > 100) return res.status(400).json({ error: 'Enter a location name up to 100 characters.' });
  const params = new URLSearchParams({ name, count: '6', language: 'en', format: 'json' });
  return proxyJson(`${OPEN_METEO_GEOCODING}/search?${params}`, res);
});

app.get('/api/reverse', async (req, res) => {
  const coordinates = coordinatesFrom(req.query);
  if (!coordinates) return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(coordinates).map(([key, value]) => [key, String(value)])), language: 'en', format: 'json' });
  return proxyJson(`${OPEN_METEO_GEOCODING}/reverse?${params}`, res);
});

// On a deployed web service, Express serves the built React frontend and API
// from one origin. In local development, Vite serves the frontend separately.
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use(express.static(path.join(projectRoot, 'dist')));
app.get('*', (_req, res, next) => {
  res.sendFile(path.join(projectRoot, 'dist', 'index.html'), (error) => {
    if (error) next();
  });
});

const server = app.listen(port, () => console.log(`Weatherly API running at http://localhost:${port}`));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Weatherly API is already running at http://localhost:${port}; reusing that server.`);
    process.exit(0);
  }
  console.error('Could not start the Weatherly API:', error.message);
  process.exit(1);
});
