# Service Marketplace Frontend

This frontend is the customer and worker web app for the Service Marketplace project.

## Main Features

- customer registration and login
- worker registration and login
- job posting
- worker dashboard for accepting and completing jobs
- customer dashboard for payments and ratings
- in-app chat
- token-based API requests

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file inside `frontend` if you want to point the app at a specific backend.

Example:

```env
REACT_APP_API_URL=http://127.0.0.1:8000
REACT_APP_WS_URL=ws://127.0.0.1:8000/ws
```

If you do not set them, the app defaults to `http://127.0.0.1:8000`.

### 3. Start the frontend

```bash
npm start
```

Open:

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Tests

Run frontend tests:

```bash
npm test -- --watchAll=false --runInBand
```

## Production Build

Build for production:

```bash
npm run build
```

If Windows or OneDrive blocks writes to the local `build` folder, use a temp build path:

```powershell
$env:BUILD_PATH = "$env:TEMP\service-marketplace-build"
npm run build
```

## Render Deployment

This frontend is deployed as a Render Static Site.

### Render settings

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `build`

### Required environment variables

Set these in the frontend Render service:

```env
REACT_APP_API_URL=https://service-marketplace-16.onrender.com
REACT_APP_WS_URL=wss://service-marketplace-16.onrender.com/ws
```

Important:

- do not add a trailing `/` to `REACT_APP_API_URL`
- after changing Render environment variables, use `Clear build cache & deploy`

### SPA routing

This project includes `public/_redirects`:

```txt
/* /index.html 200
```

That is needed so routes like `/register`, `/dashboard`, and `/chat` work on the deployed static site.

## Frontend Routes

- `/` -> login
- `/register` -> register
- `/home` -> available jobs
- `/post-job` -> post a job
- `/dashboard` -> worker dashboard
- `/customer-dashboard` -> customer dashboard
- `/chat` -> job chat

## Access Rules

- guests can only use `/` and `/register`
- customers can use `/post-job` and `/customer-dashboard`
- workers can use `/dashboard`
- authenticated users can use `/home` and `/chat`

## Manual Smoke Test

1. Register a customer
2. Log in as customer
3. Post a job
4. Log in as worker
5. Accept the job
6. Complete the job
7. Return to customer
8. Pay for the job
9. Submit a rating
10. Check chat
