# Minutes Maker

AI-powered meeting minutes tool using Sarvam AI for speech-to-text transcription and translation.

---

## Tech Stack

- **Frontend**: React (JavaScript), Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express (JavaScript), MongoDB via Mongoose
- **AI**: Sarvam AI (`saaras:v2.5` model) for transcription + translation

---

## Project Structure

```
minutes-maker/
├── backend/
│   ├── models/
│   │   └── Meeting.js          # Mongoose schema
│   ├── routes/
│   │   └── meetings.js         # All REST routes + Sarvam proxied calls
│   ├── services/
│   │   └── sarvam.js           # Sarvam API service (API key never exposed to frontend)
│   ├── server.js               # Express entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   └── UI.js           # Reusable UI components
    │   ├── context/
    │   │   └── ToastContext.js # Toast notifications
    │   ├── pages/
    │   │   ├── MeetingsPage.js        # Meetings list + CRUD
    │   │   └── MeetingDetailPage.js   # Meeting detail + audio + results
    │   ├── utils/
    │   │   ├── api.js           # All backend API calls
    │   │   └── audioConverter.js # MP4 → WAV in-browser via Web Audio API
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI

### 2. Backend

```bash
cd backend
npm install

# Create .env from example
cp .env.example .env

# Edit .env and set your values:
# SARVAM_API_KEY=your_key_here
# MONGODB_URI=mongodb://localhost:27017/minutes-maker
# PORT=5000

npm start
# or: npm run dev  (requires nodemon)
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
# Opens on http://localhost:3000
# Proxies /api/* to http://localhost:5000
```

---

## How It Works

### Meeting Flow

1. **Create a meeting** → Backend creates the meeting record AND calls Sarvam to initialize a job with `language_code: "ta-IN"` (Tamil input) and `output_language_code: "en-IN"` (English output), storing the `job_id` in MongoDB.

2. **Open a meeting** → Go to the Audio tab.

3. **Select MP4 file** → The browser reads the file.

4. **Convert to WAV** → Fully in-browser using the Web Audio API. No server round-trip for conversion.

5. **Upload & Start Job** → The WAV is sent to your backend, which:
   - Gets a signed upload URL from Sarvam
   - Uploads the WAV buffer directly to Sarvam's Azure Blob Storage
   - Calls Sarvam to start the processing job

6. **Check Status** → Polls Sarvam for job state (Pending → Processing → Completed/Failed). Status is saved to MongoDB.

7. **Pull Tamil Transcription / Pull English Translation** → Only enabled when job is `Completed`. Backend downloads the two output JSON files from Sarvam (`*_diarized_transcript.json` = Tamil, `*_diarized_translation.json` = English), normalizes them into speaker-labelled segments, and saves to MongoDB.

### Security

All Sarvam API calls are **proxied through the backend**. The `SARVAM_API_KEY` is only in the backend `.env` file and is never sent to the browser.

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/meetings` | List all meetings |
| GET | `/api/meetings/:id` | Get single meeting |
| POST | `/api/meetings` | Create meeting + Sarvam job |
| PUT | `/api/meetings/:id` | Update meeting details |
| DELETE | `/api/meetings/:id` | Delete meeting |
| POST | `/api/meetings/:id/upload-audio` | Upload WAV + start Sarvam job |
| GET | `/api/meetings/:id/job-status` | Check Sarvam job status |
| POST | `/api/meetings/:id/fetch-transcription` | Download & save transcription |
| POST | `/api/meetings/:id/fetch-translation` | Download & save translation |

---

## Environment Variables

### Backend `.env`

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/minutes-maker
SARVAM_API_KEY=sk_xxxxxxxx_...
SARVAM_BASE_URL=https://api.sarvam.ai
FRONTEND_URL=http://localhost:3000
```
