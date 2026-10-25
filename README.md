# Weatherly

A responsive full-stack weather web application:

- **Frontend:** React + Vite in `src/`.
- **Backend:** Express API in `backend/`; it validates requests and retrieves weather and geocoding data from Open-Meteo.
- **Production:** Express serves the built React site and `/api` endpoints from one web service and one public URL.

## Run locally

1. Install Node.js (LTS).
2. In the project root, install frontend dependencies with `npm install`.
3. Install backend dependencies with `npm install --prefix backend`.
4. Start both development servers using `npm run dev`.
5. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Vite proxies `/api` requests to Express on port `3001`.

The frontend and backend can also be run separately with `npm run dev:frontend` and `npm run dev:backend`. The API health endpoint is `http://localhost:3001/api/health`.

## Production build

Run `npm run build` from the root. Express serves the generated `dist/` files and API together when started with `npm --prefix backend start`.

## Deploy a public website

The included `render.yaml` is a Render Blueprint for deploying this repository as one full-stack web service. Push the project to a GitHub repository, create a new Blueprint in Render from that repository, and deploy. Render builds the React frontend, starts the Express server, and provides a public `*.onrender.com` URL. The deployment health check is `/api/health`. The first request on Render's free plan may take a little while while the service wakes up.

Weather data is provided by Open-Meteo; no API key is required. Allow browser location access or search for a city.
