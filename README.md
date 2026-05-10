# JobApply-AI Portfolio

Archived local-first AI workflow project.

This project came from an early phase where I was learning how to connect AI APIs with real user workflows. The goal was simple: take messy job information, profile data and document rules, then turn them into structured German application drafts that could still be reviewed and edited by a human.

It is not my current MojoMakes direction. I keep it public because it shows a useful learning step: frontend, backend services, local storage, PDF generation and AI-assisted writing working together in one tool.

## What it does

- stores profile and template data locally
- lets a user draft German business documents
- uses AI providers through environment variables
- renders editable previews in the browser
- exports documents with DIN 5008-oriented formatting
- keeps sensitive working data out of the repository

## Why it is public

This is a portfolio case, not a polished product.

It shows:

- React and TypeScript frontend work
- Python API services
- local SQLite-based persistence
- PDF generation
- AI provider configuration through `.env`
- a privacy-first approach for personal data
- lessons from building a real workflow instead of a demo-only prompt

## What I would do differently now

If I rebuilt this today, I would simplify the architecture and make the data model cleaner before adding more features. I would also reduce the number of services, remove more debug output, and make the UI less feature-heavy.

That is exactly why I keep it here: it shows the learning curve.

## Tech stack

- Frontend: React, TypeScript, Vite
- Desktop shell: Tauri
- Backend: Python, Flask
- Storage: SQLite
- Documents: ReportLab
- AI providers: Gemini and OpenAI through environment variables

## Local setup

```bash
pip install -r requirements.txt
cp .env.example .env
```

Add your own API keys to `.env`.

Start the backend services:

```bash
python profile_api.py
python career_profile_api_server.py
python draft_api.py
```

Start the frontend:

```bash
cd Bewerbungs-GUI
npm install
npm run dev
```

Optional desktop mode:

```bash
cd Bewerbungs-GUI
npm run tauri dev
```

## Environment variables

```bash
GOOGLE_API_KEY=your-google-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-key
ANTHROPIC_API_KEY=your-anthropic-key
PERPLEXITY_API_KEY=your-perplexity-key
```

The repository only contains placeholders. Real keys belong in your local `.env` file.

## Privacy notes

The repository intentionally ignores generated documents, local databases, personal profiles and real configuration files.

Ignored examples:

- `.env`
- `*.db`
- `*.sqlite`
- `applications/`
- `exports/`
- `profiles/`
- `personal_data.json`
- `processed_jobs.json`

## Screenshots

### Dashboard
![Job Search Dashboard](screenshots/Bildschirmfoto%202025-08-26%20um%2018.25.25.png)

### Configuration and profile management
<div align="center">
  <img src="screenshots/Bildschirmfoto%202025-08-26%20um%2018.25.45.png" width="45%" alt="Settings panel">
  <img src="screenshots/Bildschirmfoto%202025-08-26%20um%2018.25.54.png" width="45%" alt="API configuration">
</div>

### Career profile
![Career Profile System](screenshots/Bildschirmfoto%202025-08-26%20um%2018.26.17.png)

## Status

Archived. I am not actively building this further. My current work is MojoMakes: websites and lightweight business systems for small businesses.
