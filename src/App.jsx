import { useEffect, useMemo, useState } from 'react';

const WEATHER = {
  0: ['Clear sky', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'], 48: ['Icy fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Heavy showers', '🌧️'], 85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm & hail', '⛈️'], 99: ['Thunderstorm & hail', '⛈️'],
};
const weatherInfo = (code) => WEATHER[code] ?? ['Weather', '🌤️'];
const dayName = (date, options) => new Intl.DateTimeFormat(undefined, options).format(new Date(`${date}T12:00:00`));
const hourName = (date) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(date));

function App() {
  const [place, setPlace] = useState({ name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 });
  const [weather, setWeather] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('celsius');

  useEffect(() => {
    const controller = new AbortController();
    const loadWeather = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, unit });
        const response = await fetch(`/api/weather?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('The weather service is unavailable right now. Please try again.');
        setWeather(await response.json());
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Could not load weather. Check your connection and try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadWeather();
    return () => controller.abort();
  }, [place, unit]);

  const currentHourIndex = useMemo(() => {
    if (!weather?.hourly?.time) return 0;
    const now = new Date();
    let best = 0;
    for (let i = 0; i < weather.hourly.time.length; i += 1) {
      if (new Date(weather.hourly.time[i]) <= now) best = i;
      else break;
    }
    return best;
  }, [weather]);

  async function searchLocations(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/geocode?name=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error('Location search is temporarily unavailable.');
      const data = await response.json();
      if (!data.results?.length) throw new Error(`We couldn't find “${term}”. Try another city or town.`);
      setSuggestions(data.results);
    } catch (err) {
      setError(err.message || 'Could not search locations. Please try again.');
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  function selectPlace(result) {
    setPlace({ name: result.name, country: result.country || result.admin1 || '', latitude: result.latitude, longitude: result.longitude });
    setQuery('');
    setSuggestions([]);
  }

  function useMyLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Search for a city instead.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`/api/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}`);
        const data = await response.json();
        const result = data.results?.[0];
        setPlace({ name: result?.name || 'Your location', country: result?.country || '', latitude: coords.latitude, longitude: coords.longitude });
      } catch {
        setPlace({ name: 'Your location', country: '', latitude: coords.latitude, longitude: coords.longitude });
      }
    }, () => {
      setLoading(false);
      setError('We couldn’t access your location. Allow location permission or search for a city.');
    }, { timeout: 10000 });
  }

  const current = weather?.current;
  const conditions = current ? weatherInfo(current.weather_code) : ['Loading forecast', '🌤️'];
  const tempUnit = unit === 'celsius' ? '°' : '°';
  const hourly = weather?.hourly;
  const daily = weather?.daily;
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Weatherly home"><span className="brand-mark">w.</span><span>weatherly<span className="brand-dot">.</span><small>YOUR DAILY FORECAST</small></span></a>
        <div className="top-actions">
          <button className="location-button" onClick={useMyLocation}><span aria-hidden="true">◎</span> Use my location</button>
          <div className="unit-toggle" aria-label="Temperature units">
            <button className={unit === 'celsius' ? 'active' : ''} onClick={() => setUnit('celsius')} aria-pressed={unit === 'celsius'}>°C</button>
            <button className={unit === 'fahrenheit' ? 'active' : ''} onClick={() => setUnit('fahrenheit')} aria-pressed={unit === 'fahrenheit'}>°F</button>
          </div>
        </div>
      </header>

      <section className="welcome-row" id="top">
        <div><p className="eyebrow">YOUR WEATHER, AT A GLANCE</p><h1>A little more sunshine <span>in your day.</span></h1></div>
        <form className="search-form" onSubmit={searchLocations}>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input aria-label="Search for a city" placeholder="Search a city..." value={query} onChange={(event) => { setQuery(event.target.value); setSuggestions([]); }} />
          <button type="submit" aria-label="Search" disabled={searching}>{searching ? '…' : '→'}</button>
          {suggestions.length > 0 && <div className="suggestions" role="listbox">{suggestions.map((result) => <button type="button" role="option" key={`${result.id}-${result.latitude}`} onClick={() => selectPlace(result)}><span>{result.name}</span><small>{[result.admin1, result.country].filter(Boolean).join(', ')}</small></button>)}</div>}
        </form>
      </section>

      {error && <div className="error-banner" role="alert"><span>ⓘ</span> {error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}

      <section className="dashboard-grid" aria-label="Weather dashboard">
        <article className="current-card">
          <div className="current-card-top"><div><span className="live-dot" /> CURRENT WEATHER</div><span className="today-label">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</span></div>
          <div className="place-line"><div><h2>{place.name}</h2><p>{place.country || 'Local forecast'}</p></div><span className="sun-orb" aria-hidden="true">{conditions[1]}</span></div>
          <div className="temperature-line">{loading && !current ? <span className="loading-temp">--</span> : <>{Math.round(current?.temperature_2m ?? 0)}<span>{tempUnit}</span></>}</div>
          <p className="condition-text">{loading ? 'Getting your forecast…' : conditions[0]} <span>·</span> Feels like {Math.round(current?.apparent_temperature ?? 0)}{tempUnit}</p>
          <div className="current-divider" />
          <div className="stats-row">
            <div className="stat"><span className="stat-icon">💧</span><span><small>HUMIDITY</small><strong>{current?.relative_humidity_2m ?? '—'}<i>%</i></strong></span></div>
            <div className="stat"><span className="stat-icon">↗</span><span><small>WIND</small><strong>{Math.round(current?.wind_speed_10m ?? 0)}<i> km/h</i></strong></span></div>
            <div className="stat"><span className="stat-icon">☂</span><span><small>PRECIP.</small><strong>{current?.precipitation ?? '—'}<i> mm</i></strong></span></div>
          </div>
        </article>

        <article className="sun-card">
          <div className="section-heading"><div><span className="eyebrow">THE DAY AHEAD</span><h2>Sunrise & sunset</h2></div><span className="heading-icon">☼</span></div>
          <div className="sun-times"><div><span className="sunrise-icon">↗</span><div><small>SUNRISE</small><strong>{daily?.sunrise?.[0] ? hourName(daily.sunrise[0]) : '—'}</strong></div></div><div><span className="sunset-icon">↘</span><div><small>SUNSET</small><strong>{daily?.sunset?.[0] ? hourName(daily.sunset[0]) : '—'}</strong></div></div></div>
          <div className="sun-path"><span className="path-sun">☀</span></div>
          <div className="sun-caption"><span>Rise and shine</span><span>See you tomorrow</span></div>
        </article>

        <article className="forecast-card hourly-card">
          <div className="section-heading"><div><span className="eyebrow">PLAN YOUR HOURS</span><h2>Today’s forecast</h2></div><span className="subtle-label">NEXT 24 HOURS</span></div>
          <div className="hourly-list">{hourly?.time?.slice(currentHourIndex, currentHourIndex + 8).map((time, offset) => { const i = currentHourIndex + offset; const info = weatherInfo(hourly.weather_code[i]); return <div className={`hour-item ${offset === 0 ? 'hour-now' : ''}`} key={time}><small>{offset === 0 ? 'Now' : hourName(time)}</small><span>{info[1]}</span><strong>{Math.round(hourly.temperature_2m[i])}°</strong>{hourly.precipitation_probability[i] > 0 && <em>💧 {hourly.precipitation_probability[i]}%</em>}</div>; }) ?? <p className="muted">Hourly forecast will appear here.</p>}</div>
        </article>

        <article className="forecast-card week-card">
          <div className="section-heading"><div><span className="eyebrow">AHEAD OF THE WEATHER</span><h2>7-day forecast</h2></div><span className="subtle-label">HIGH / LOW</span></div>
          <div className="week-list">{daily?.time?.map((date, i) => { const info = weatherInfo(daily.weather_code[i]); return <div className={`day-row ${i === 0 ? 'day-today' : ''}`} key={date}><span className="day-name">{i === 0 ? 'Today' : dayName(date, { weekday: 'short' })}</span><span className="day-weather">{info[1]} <small>{info[0]}</small></span><span className="rain-chance">{daily.precipitation_probability_max[i] > 0 ? `💧 ${daily.precipitation_probability_max[i]}%` : ''}</span><span className="day-high">{Math.round(daily.temperature_2m_max[i])}°</span><span className="day-low">{Math.round(daily.temperature_2m_min[i])}°</span></div>; }) ?? <p className="muted">The weekly forecast will appear here.</p>}</div>
        </article>
      </section>
      <footer><span>☀</span> Made for brighter days <i>·</i> Weather data by Open-Meteo</footer>
    </main>
  );
}

export default App;
