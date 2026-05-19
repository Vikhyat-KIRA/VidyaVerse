# 🌌 VidyaVerse — The Gamified AI Study Universe

Welcome to **VidyaVerse**, the ultimate high-engagement, gamified social learning platform and productivity suite. Designed to transform traditional studying into a sleek, immersive adventure, VidyaVerse empowers students with advanced AI mentors, real-time collaboration, and scientific retention systems.

🚀 **Live Deployment:** [vidyaverse.vercel.app](https://vidyaverse.vercel.app)

---

## 🌟 Core Ecosystem Features

### 🔮 1. VAYU — Mystical AI Study Mentor
*   **Context-Aware Intelligence**: VAYU injects direct, personalized academic data (aims, goals, weaknesses) pulled in real-time from active student databases and connected Google Sheets.
*   **Persistent Memory Vault**: Long-term context storage lets VAYU track your learning path progress over weeks and months, tailoring its explanations and quizzes to your direct improvement curve.

### 🔒 2. Real-Time 1-on-1 Private DMs (Jane & Emily System)
*   **Special Invite Codes**: Connect privately and securely with classmates using temporary 6-character room codes. No email sharing required.
*   **Auto-Lock Privacy**: The second a friend enters the code, the room mapping is wiped from public discovery, locking it strictly into a 2-person, peer-to-peer workspace.
*   **Dynamic Title Resolvers**: Displays conversational titles customized to the active viewer (e.g. Jane sees "Emily", while Emily sees "Jane"), maintaining a clean, native-app messaging feel.

### ⚡ 3. Flash-Forge Vault (Spaced Repetition)
*   **Leitner System Spaced Repetition**: Master concepts scientifically using a 5-box card progression scheme.
*   **VAYU Card Forging**: Instantly extract study material from any topic or document, generating optimized question-and-answer decks on the fly using AI.

### ⏳ 4. Pomodoro Audio Coach
*   **High-Intensity Intervals**: A beautiful glassmorphic visual countdown timer designed to maintain focus.
*   **Voice Interruptions**: Voice-alert feedback systems keep you accountable when intervals start, complete, or if you lose focus.

### 🖼️ 5. Flash-Forge Vision Module
*   **Document Visual Analysis**: Upload slides, textbook images, or PDF screenshots.
*   **OCR Parsing**: Parses content visually, delivering instant conceptual breakdowns, step-by-step math explanations, and auto-generated study briefs.

### ⚔️ 6. Gamification: Leaderboards & Boss Battles
*   **Academic Weapons Leaderboard**: Compete globally, earning XP and climbing ranks from *Academic Rookie* to *Omniscient Scholar*.
*   **Daily Streaks**: Maintain consistent study habits to keep your streak multiplier active.
*   **Boss Battles**: Test your knowledge under pressure by fighting gamified academic bosses with timed, AI-generated subject question pools.

---

## 🛠️ The Tech Stack

*   **Core Framework**: Next.js 15 (App Router), React 19, TypeScript
*   **Design & Motion**: TailwindCSS (Harmonious Dark Theme, Sleek Glassmorphism), Framer Motion
*   **Database & Auth**: Firebase (Authentication, low-latency Firestore Real-time Sync)
*   **AI Models**: Gemini 1.5 Pro & Flash APIs (multimodal vision, text generation)
*   **Integrations**: Google Sheets API (for persistent student profiles)
*   **SEO Optimization**: Next.js Metadata API, automated `sitemap.xml` and `robots.txt` routing, and detailed JSON-LD Software Schema graphs.

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your local machine.

### 🔧 Installation & Local Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Vikhyat-KIRA/VidyaVerse.git
   cd VidyaVerse
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and supply the following variables:
   ```env
   # Firebase Credentials
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key

   # Google Sheets Integration
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   GOOGLE_PRIVATE_KEY=your_google_private_key
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   ```

4. **Launch Dev Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the VidyaVerse dashboard locally!

---

## 🎯 Production Build & SEO Validation

Verify types and construct the production build bundle:
```bash
npx tsc --noEmit
npm run build
```

The sitemap and crawler policies can be viewed directly after launching in production:
*   Sitemap: `/sitemap.xml`
*   Robot Crawlers: `/robots.txt`

---

## 📜 License
Developed as part of the VidyaVerse high-engagement social learning research ecosystem. Distributed under the MIT License.
