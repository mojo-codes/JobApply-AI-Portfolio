# 🤖 JobApply-AI - AI-Powered Job Application Assistant

An intelligent job application management system that automates the job search and application process using AI.

## 🚀 Features

### 🔍 Intelligent Job Search
- Multi-platform job search (StepStone, Adzuna, JSearch API)
- AI-powered job matching and ranking
- Customizable search templates and filters
- Smart duplicate detection

### 📝 AI Application Generation
- Personalized cover letters using OpenAI/Gemini AI
- DIN 5008 compliant German business letters
- Company address resolution and validation  
- Smart placeholder replacement system

### 💼 Profile Management
- Career profile management system
- Skills and experience tracking
- Search template creation and management
- Personal data management with privacy focus

### 🎨 Modern Frontend
- React + TypeScript user interface
- Real-time application preview
- WYSIWYG smart editing mode
- Tauri desktop application

### 🔧 System Architecture
- **Backend**: Python Flask APIs
- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust)
- **AI Integration**: OpenAI GPT, Google Gemini
- **Database**: SQLite for local data storage

## 🛠️ Technology Stack

### Backend
- **Python 3.9+** - Core application logic
- **Flask** - REST API framework
- **SQLite** - Local database
- **OpenAI API** - AI text generation
- **Google Gemini API** - Alternative AI provider

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tauri** - Desktop app framework (Rust)

### APIs & Services
- **StepStone API** - German job search
- **Adzuna API** - International job search  
- **JSearch API** - Additional job sources
- **Google Maps API** - Address geocoding

## 📦 Installation

### Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher
- Rust (for Tauri desktop app)

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the APIs
python profile_api.py &
python career_profile_api_server.py &  
python draft_api.py &
```

### Frontend Setup
```bash
cd Bewerbungs-GUI
npm install
npm run dev
```

### Environment Variables
Create a `.env` file based on `.env.example`:
```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_gemini_api_key
STEPSTONE_API_KEY=your_stepstone_key
ADZUNA_API_KEY=your_adzuna_key
```

## 🏃‍♂️ Usage

1. **Start Backend Services**: Run the Python APIs
2. **Launch Frontend**: Start the React development server  
3. **Create Profile**: Set up your career profile and skills
4. **Configure Search**: Create search templates for job types
5. **Search Jobs**: Let the AI find and rank relevant positions
6. **Generate Applications**: Create personalized cover letters

## 🔒 Privacy & Security

- All personal data stored locally
- No data sent to third-parties except AI providers
- API keys stored securely in environment variables
- Sensitive files excluded from version control

## 🤝 Contributing

This is a personal project portfolio. For inquiries or collaboration:
- Open an issue for bug reports
- Fork the repository for contributions  
- Follow the existing code style and patterns

## 📄 License

This project is for portfolio demonstration purposes. All rights reserved.

## 🔧 System Health

The system includes a built-in health check:
```bash
python system_health_check.py
```

## 📝 Notes

This application was developed as a personal tool for job application automation in the German market. It demonstrates:
- Full-stack development with modern technologies
- AI integration and prompt engineering  
- REST API design and implementation
- React/TypeScript frontend development
- System integration and automation
- Privacy-focused data handling

---

*This is a portfolio project showcasing AI-powered automation and full-stack development skills.*