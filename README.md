# Corpus

> Your personal knowledge base — save anything, find it later.

Corpus (a.k.a. "mymind") is a full-stack personal knowledge management app. Save links, notes, and images from anywhere on the web, and let AI organize them for you — so nothing you find ever gets lost again.

![Corpus Banner](./assets/banner.png)

---

## ✨ Features

- **Save from anywhere** — Chrome extension lets you save links, selected text, and images in one click, right from your right-click menu.
- **AI-powered organization** — Automatic TLDR generation and auto-tagging (via Groq/LLaMA) so every save is summarized and categorized without manual effort.
- **Smart Search** — Full-text and semantic search across everything you've ever saved.
- **Spaces** — Group related saves into dedicated collections/projects.
- **Drift Mode** — Resurfaces old saves at random, so forgotten gems don't stay forgotten.
- **Persistent login** — Sign in once via the extension; stays authenticated for months using secure token refresh, no repeated logins.
- **Credit system** — Usage-based limits for AI features.

---

## 📸 Screenshots

### Web App — Dashboard
![Dashboard](./assets/dashboard.png)

### tags
![search by Tags](./assets/tags.png)

### Spaces
![Spaces](./assets/spaces.png)

### Drift Mode
![Drift Mode](./assets/drift.png)

---

## 🛠️ Tech Stack

| Layer         | Tech                                      |
|---------------|--------------------------------------------|
| Frontend      | React, MERN stack                          |
| Backend       | Node.js, Express                           |
| Database      | MongoDB                                    |
| AI            | Groq (LLaMA) — summarization & tagging     |
| Auth          | JWT (access + refresh tokens)              |
| Deployment    | Vercel (frontend), Render (backend)        |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Groq API key

### Setup

```bash
# Clone the repo
git clone https://github.com/dSAxmonis/corpus.git
cd corpus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your MongoDB URI, JWT secrets, and Groq API key

# Run locally
npm run dev
```



## 📁 Project Structure

```
corpus/
├── client/          # React frontend
├── server/          # Express backend & API
├── assets/           # README images/screenshots
└── README.md
```

---

## 🗺️ future roadmap
- [ ] Vector search / RAG for semantic recall
- [ ] Redis caching layer
- [ ] CI/CD pipeline
- [ ] Mobile app

---

## 📄 License

MIT
---
🌱 made my Monis

