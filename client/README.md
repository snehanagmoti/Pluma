# Pluma web client

The React 19 client is built with Vite 8. Routes are loaded on demand so heavyweight authoring, canvas, and planning packages do not block the first screen.

## Commands

```powershell
npm install
npm run dev       # local development server
npm run build     # optimized production bundle in dist/
npm run preview   # serve the production bundle locally
```

Vite requires Node.js 20.19+ or 22.12+. Configure the API and optional Google Sign-In client in `.env`; see `.env.example`. Both `VITE_*` and the previous `REACT_APP_*` variable names are accepted so existing local environments continue to work.

For all product, backend, AI, catalog, and deployment details, see the repository-level `README.md`.
