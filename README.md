# 🤖 JobApply-AI - Intelligent Job Application Management System

An AI-powered job application automation system that streamlines the entire job search and application process using advanced language models and smart automation.

## 🚀 Key Features

### 🧠 AI-Powered Application Generation
- **Gemini 2.5 Flash** primary AI provider for high-quality German applications
- **OpenAI GPT** fallback integration for reliable text generation
- Personalized cover letters tailored to specific job requirements
- DIN 5008 compliant German business letter formatting

### 🎨 Modern User Interface
- **React + TypeScript** frontend with responsive design
- **WYSIWYG Smart Edit Mode** - edit applications directly in PDF layout preview
- **Tauri Desktop App** for native macOS/Windows experience
- Real-time application preview with live editing capabilities

### 💼 Comprehensive Profile Management
- **Career Profile System** - skills, experience, and personal branding
- **Search Template Engine** - customizable job search criteria
- **Dynamic Profile Matching** - AI matches profiles to job requirements
- Centralized personal data management with privacy focus

### 🔧 Advanced System Architecture
- **Multi-API Backend** - separate services for different functionalities
- **SQLite Database** - local data storage with privacy protection
- **Health Check System** - automatic service monitoring and diagnostics
- **Modular Design** - easy to extend and maintain

## 🏗️ System Architecture

### Backend Services (Python Flask)
```
Profile API (Port 5001)     - Search template management
Career Profile API (5003)   - Personal career data & skills
Draft API (Port 8000)       - Application drafts & PDF generation
Job API (Port 5002)         - Job search and ranking (when available)
```

### Frontend (React + Tauri)
```
React Application (Port 1420) - Main user interface
Tauri Desktop App             - Native desktop experience
```

### AI Integration
- **Primary**: Google Gemini 2.5 Flash (GOOGLE_API_KEY)
- **Fallback**: OpenAI GPT Models (OPENAI_API_KEY)
- **Maps**: Google Maps API for company address resolution

## 🛠️ Technology Stack

### Core Technologies
- **Backend**: Python 3.9+, Flask, SQLite
- **Frontend**: React 18, TypeScript, Vite
- **Desktop**: Tauri (Rust), Native OS Integration
- **AI**: Google Gemini, OpenAI GPT
- **PDF Generation**: ReportLab with DIN 5008 formatting

### Key Dependencies
- **google-generativeai** - Gemini AI integration
- **openai** - GPT model access
- **flask** - REST API framework
- **sqlite3** - Local database
- **reportlab** - PDF generation
- **selenium** - Optional web automation
- **react** - UI framework
- **tauri** - Desktop app framework

## 📦 Installation & Setup

### Prerequisites
```bash
# Required
Python 3.9+
Node.js 18+
npm or yarn

# Optional (for desktop app)
Rust + Cargo
```

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start all services
python profile_api.py &
python career_profile_api_server.py &
python draft_api.py &

# Verify services are running
python system_health_check.py
```

### Frontend Setup
```bash
cd Bewerbungs-GUI
npm install
npm run dev
```

### Desktop App (Optional)
```bash
cd Bewerbungs-GUI
npm run tauri dev
```

## ⚙️ Configuration

### Required Environment Variables
```bash
# AI Providers (at least one required)
GOOGLE_API_KEY=your-google-gemini-api-key      # Primary AI provider
OPENAI_API_KEY=your-openai-api-key             # Fallback AI provider

# Maps & Address Resolution
GOOGLE_MAPS_API_KEY=your-google-maps-key       # Company address lookup

# Optional: Additional providers
ANTHROPIC_API_KEY=your-anthropic-key
PERPLEXITY_API_KEY=your-perplexity-key
```

### System Configuration
The system uses a centralized `ConfigManager` that loads from:
1. Environment variables (.env file) - **highest priority**
2. config.yaml file - fallback values
3. Default values - system defaults

## 🚀 Usage

### 1. System Health Check
```bash
python system_health_check.py
```
Always run this first to verify all services are operational.

### 2. Create Career Profile
- Launch the frontend application
- Navigate to Career Profile management
- Add your skills, experience, and personal information
- Save and activate your profile

### 3. Set Up Search Templates
- Create search templates for different job types
- Configure keywords, filters, and preferences
- Use templates to focus your job search

### 4. Generate Applications
- Use manual job entry or automated job discovery
- Select appropriate career profile and search template
- Generate personalized cover letters with AI
- Export professional PDF applications

### 5. Application Management
- Review and edit generated drafts
- Use WYSIWYG editor for real-time preview
- Export to PDF with proper DIN 5008 formatting
- Organize applications by company and date

## 🎯 Core Workflows

### AI Application Generation
1. **Job Analysis** - AI analyzes job requirements
2. **Profile Matching** - System matches relevant experience
3. **Content Generation** - Gemini/GPT creates personalized content  
4. **Format Compliance** - Ensures DIN 5008 business letter standards
5. **Quality Review** - Built-in checks and validation

### Profile Management
1. **Career Data Entry** - Skills, experience, achievements
2. **Template Creation** - Reusable search and application templates
3. **Dynamic Matching** - AI-powered profile-to-job matching
4. **Version Control** - Track changes and maintain profiles

### System Integration
- **Health Monitoring** - Automatic service health checks
- **Error Handling** - Graceful degradation and fallbacks
- **Data Privacy** - All data stored locally, no cloud dependencies
- **Extensibility** - Modular architecture for easy enhancements

## 🔒 Privacy & Security

### Data Protection
- **Local Storage Only** - No cloud synchronization
- **API Key Security** - Environment variable protection
- **Personal Data Isolation** - Separate data from application logic
- **No Tracking** - No analytics or user behavior tracking

### Security Features
- Input validation and sanitization
- SQL injection prevention
- Cross-site scripting (XSS) protection
- Secure API key handling

## 🧪 Testing & Development

### Health Monitoring
```bash
# Complete system check
python system_health_check.py

# Individual service tests
curl http://localhost:5001/api/health    # Profile API
curl http://localhost:5003/health        # Career Profile API  
curl http://localhost:8000/drafts        # Draft API
```

### Development Tools
- Built-in health check system
- API endpoint testing capabilities
- Debug mode for development
- Comprehensive error logging

## 📄 API Documentation

### Profile Management API (Port 5001)
- `GET /api/profiles` - List search templates
- `POST /api/profiles` - Create new template
- `PUT /api/profiles/{id}` - Update template
- `DELETE /api/profiles/{id}` - Remove template

### Career Profile API (Port 5003)  
- `GET /api/career-profiles` - List career profiles
- `POST /api/career-profiles` - Create profile
- `PUT /api/career-profiles/{name}/activate` - Set active profile
- `GET /api/career-profiles/active` - Get current profile

### Draft Management API (Port 8000)
- `GET /drafts` - List application drafts
- `POST /drafts` - Create new draft
- `POST /drafts/export` - Generate PDF export
- `PUT /drafts/{id}` - Update draft content

## 🎨 User Interface Features

### Smart Edit Mode
- **WYSIWYG Editing** - Edit directly in PDF preview layout
- **Real-time Updates** - See changes instantly
- **DIN 5008 Compliance** - Automatic formatting validation
- **Responsive Design** - Works on desktop and tablet

### Application Management
- **Draft System** - Save and resume applications
- **Template Library** - Reuse successful applications
- **Export Options** - PDF generation with multiple formats
- **Preview Modes** - Text edit, smart edit, and read-only preview

## 🤝 Contributing

This is a portfolio project demonstrating:
- Full-stack development with modern technologies
- AI integration and prompt engineering
- System architecture and API design
- Desktop application development
- German business communication standards

## 📞 Technical Notes

### Performance Considerations
- **Local Processing** - No cloud dependencies for core functionality
- **Efficient Caching** - Smart caching of API responses
- **Lazy Loading** - Optimized frontend performance
- **Background Processing** - Non-blocking operations

### Scalability Features
- **Modular Architecture** - Easy to add new features
- **API Separation** - Independent service scaling
- **Database Optimization** - Efficient SQLite usage
- **Resource Management** - Memory and CPU optimization

---

**This project showcases modern full-stack development, AI integration, and practical automation solutions for real-world workflow optimization.**