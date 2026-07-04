# CampusPulse AI 🎓

CampusPulse AI is an AI-powered campus communication platform that simplifies campus communication by delivering notices to the right students at the right time.

Faculty members can upload notices as plain text, PDFs, or images. The system automatically extracts text using OCR, generates AI-powered summaries, categorizes notices, and sends personalized real-time notifications to eligible students.

---

## Features

### Authentication
- JWT Authentication
- Student, Faculty, and Admin roles
- Email Verification
- Password Reset
- Role-based Authorization

### Smart Notice Management
- Faculty can upload notices as text, PDF, or image
- OCR extracts text from uploaded documents
- AI-generated summaries
- Automatic notice categorization
- Personalized student feeds

### Real-Time Notifications
- Instant notifications using Socket.IO
- Notifications sent only to eligible students

### Student Features
- Personalized dashboard
- Bookmark important notices
- Natural language search
- AI Assistant
- Event recommendations
- Placement portal
- Club management

### Faculty Features
- Create, edit, and delete notices
- Upload documents
- View notice analytics
- Track student reach

### Admin Features
- Approve or reject notices
- Manage users
- Upload student/faculty roster
- View platform analytics

---

## Tech Stack

### Frontend
- React.js
- Vite
- CSS
- Socket.IO Client

### Backend
- FastAPI
- Python
- JWT Authentication
- Socket.IO

### Database
- MongoDB Atlas

### AI
- Hugging Face Transformers
- Tesseract OCR
- NLP-based Summarization
- AI-based Categorization

---

## System Architecture

```text
Faculty
   │
   ▼
Upload Notice (Text / PDF / Image)
   │
   ▼
OCR (Tesseract)
   │
   ▼
AI Processing
 ├── Summarization
 ├── Categorization
 └── Information Extraction
   │
   ▼
MongoDB
   │
   ▼
Personalized Student Feed
   │
   ▼
Real-Time Notifications
```

---

## Project Structure

```text
CampusPulse/
│
├── backend/
│   ├── ai/
│   ├── auth/
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── utils/
│   └── main.py
│
├── frontend/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   └── App.jsx
│
└── README.md
```

---

## Installation

### Clone the Repository

```bash
git clone <repository-url>

cd CampusPulse
```

---

### Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
```

Run the backend:

```bash
uvicorn main:app --reload
```

---

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

## Workflow

1. Faculty uploads a notice as text, PDF, or image.
2. OCR extracts text from uploaded files.
3. AI summarizes and categorizes the notice.
4. The notice is sent to the admin for approval.
5. Once approved, eligible students receive real-time notifications.
6. Students can search, bookmark, and access notices anytime.

---

## Future Enhancements

- Email notifications
- Mobile application
- Dark mode
- AI chatbot powered by Large Language Models
- Advanced recommendation engine
- CI/CD deployment pipeline
