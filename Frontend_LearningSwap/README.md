# Learning Swap

> A peer-to-peer skill exchange platform. Teach what you know, learn what you need — in real time, securely, and without economic barriers.

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Made with](https://img.shields.io/badge/built%20with-vanilla%20JS-yellow)

**Live:** https://learning-swap-front-end-seven.vercel.app  
**Backend:** https://learning-swap-backend.onrender.com  
**Repository:** https://github.com/MigueRestreG/Learning_Swap_FrontEnd

https://github.com/JuanDavidsh23/Learning_Swap.git

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Navigation Map](#navigation-map)
- [Membership Plans](#membership-plans)
- [Testing](#testing)
- [Deployment](#deployment)
- [Team](#team)
- [References](#references)
- [JSON Server Setup](#json-server-setup)

---

## Overview

Learning Swap is a Single Page Application (SPA) built with vanilla HTML, CSS and JavaScript, using Vite as a bundler. It connects people who want to exchange skills and knowledge through a matching system inspired by social discovery apps. Users create a profile declaring what they can teach and what they want to learn. The platform connects users with complementary interests, enables real-time chat per match room, and offers tiered membership plans to unlock additional features.

The project was developed as part of the **CodeUp integrator project — Basic Route** at **RIWI** by team **Phantom**.

---

## Problem Statement

Thousands of people possess valuable skills they do not know how to share, while others seek to learn precisely those skills without access to affordable platforms. Traditional online learning solutions present significant economic barriers and do not facilitate direct peer-to-peer exchange.

This gap is particularly acute in programming and technology communities, where knowledge evolves rapidly and collaborative learning is fundamental for professional growth. Learning Swap proposes a platform where knowledge is exchanged, not sold — democratizing access to learning and building communities of real value.

---

## Features

- User registration and login with JWT-based authentication
- Editable profile with photo upload, bio, and skill lists (teach / learn)
- Profile discovery feed with swipe mechanics (like / pass)
- Mutual match system: a match is created when two users like each other
- Real-time chat per match room via WebSockets
- In-app notification system with toast messages and notification panel
- Browser Notification API integration for background alerts
- Membership plans (Free, Emerald, Ruby, Diamond) with monthly/annual billing toggle
- Checkout page with client-side form validation, loading spinner, and success modal
- Payment receipt generation and print-to-PDF via browser
- Payment persistence via REST API (JSON Server in development)
- Membership badge displayed on user profile after purchase
- Protected hash-based routing with automatic redirect when unauthenticated
- Fully responsive layout across desktop, tablet, and mobile

---

## Tech Stack

| Technology | Category | Purpose |
|---|---|---|
| HTML5 | Frontend | Semantic structure of all views |
| CSS3 | Frontend | Styles, animations, responsive design |
| JavaScript ES6+ | Frontend | Business logic, SPA routing, DOM management |
| Vite 5 | Bundler | Development server and build tool |
| Ionicons 7 | UI Library | Vector icon set |
| Spline Viewer | UI Library | 3D model rendering in checkout view |
| Node.js + Express | Backend | REST API for auth, users, matches, messages |
| WebSockets | Backend | Real-time chat per match room |
| JWT | Security | Authentication and route protection |
| JSON Server | Mock DB | Payment persistence in development |
| Vercel | Deployment | Frontend hosting with global CDN |
| Render | Deployment | Backend hosting with auto-deploy |
| Git / GitHub | Version Control | Repository, branching, pull requests |
| Azure DevOps | Project Management | Sprints, backlog, SCRUM tracking |

---

## Project Structure
```
Learning_Swap_FrontEnd/
├── public/
│   └── assets/
│       ├── logos/
│       ├── cards-img/
│       ├── credit-cards-payzone/
│       └── programing-icons/
├── src/
│   ├── components/
│   │   └── navbar.js
│   ├── pages/
│   │   ├── profile/
│   │   │   ├── render.js
│   │   │   └── helpers.js
│   │   ├── swaps/
│   │   │   ├── matches-chat.js
│   │   │   └── avatar-utils.js
│   │   ├── home.js
│   │   ├── login.js
│   │   ├── swaps.js
│   │   ├── chats.js
│   │   ├── profile.js
│   │   ├── memberships.js
│   │   ├── checkout.js
│   │   └── admin.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── styles.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── navbar.css
│   │   ├── home.css
│   │   ├── auth.css
│   │   ├── profile.css
│   │   ├── swaps.css
│   │   ├── memberships.css
│   │   ├── checkout.css
│   │   └── prices.css
│   ├── utils/
│   │   └── auth.js
│   └── main.js
├── db.json
├── index.html
├── vite.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher — https://nodejs.org
- npm v9 or higher
- A modern browser (Chrome, Firefox, Edge, Safari)

### Installation
```bash
# Clone the repository
git clone https://github.com/MigueRestreG/Learning_Swap_FrontEnd.git

# Navigate into the project folder
cd Learning_Swap_FrontEnd

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file at the root of the project with the following variables

For local development against a local backend:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

> Vite exposes only variables prefixed with `VITE_` to the client bundle. See the [Vite env documentation](https://vitejs.dev/guide/env-and-mode) for details.

---

## Architecture

Learning Swap follows a decoupled client-server architecture:

**Frontend (SPA)**  
A single-page application with hash-based routing. Navigation between views is handled entirely on the client side without page reloads. Each route (`#home`, `#swaps`, `#chats`, `#profile`, `#memberships`, `#checkout`) maps to a JavaScript module that renders its own HTML, registers its event listeners, and registers a cleanup function (`window.__swapsCleanup`) that is called before the next view renders.

**Backend (REST API)**  
A Node.js server using Express that exposes endpoints for authentication, user management, skill matching, real-time messaging, and payment records. JWT tokens are issued on login and expected on all protected endpoints via the `Authorization: Bearer <token>` header.

**Real-time Chat**  
WebSocket connections are opened per match room. On room open, the client fetches the full message history via REST, then connects to the WebSocket endpoint for live updates. The connection is closed and cleaned up when the user navigates away or closes the chat panel.

**Payments (development)**  
In development, payment records are persisted to a local `db.json` file via JSON Server running on port 3001. The checkout page falls back to localStorage receipt storage if the server is unavailable.

---

## Navigation Map

| Route | View | Auth required |
|---|---|---|
| `#home` | Landing page with plans section | No |
| `#swaps` | Match dashboard and discovery feed | Yes |
| `#chats` | Conversations and real-time chat | Yes |
| `#profile` | User profile and edit modal | Yes |
| `#memberships` | Membership plans with billing toggle | Yes |
| `#checkout` | Payment form | Yes |

All protected routes redirect to `#home` when accessed without a valid session.

---

## Membership Plans

| Plan | Monthly | Annual (–20%) | Key features |
|---|---|---|---|
| Free | $0 | $0 | Up to 2 matches, basic chat |
| Emerald | $12,000 | $9,600 | Up to 5 matches, advanced chat, exclusive rooms |
| Ruby | $25,000 | $20,000 | Up to 7 matches, prioritized feed, reputation badge |
| Diamond | $35,000 | $28,000 | Unlimited matches, priority support, highlighted profile, exclusive badge |

After a successful payment, the selected plan is stored in `localStorage` under the key `user-membership` and a colored badge is rendered next to the user's name on their profile page.

---

## Testing

Manual functional testing was performed on all primary flows before deployment:

| Test case | Expected result | Status |
|---|---|---|
| Register with valid data | User created, redirected to onboarding | Pass |
| Register with duplicate email | Clear error message, no crash | Pass |
| Login with correct credentials | JWT stored, dashboard accessible | Pass |
| Login with incorrect credentials | Error message displayed | Pass |
| Edit profile with photo upload | Photo updated immediately | Pass |
| Like a profile in the feed | Like registered, card removed from feed | Pass |
| Mutual match generated | Match appears in conversation list | Pass |
| Send message in chat | Message visible in real time for both users | Pass |
| Switch to annual billing | Prices updated with 20% discount | Pass |
| Submit checkout with empty fields | Per-field validation errors displayed | Pass |
| Complete a valid payment | Success modal shown, record saved to DB | Pass |
| Navigate to protected route without auth | Automatic redirect to `#home` | Pass |

---

## Deployment

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://learning-swap-front-end-seven.vercel.app |
| Backend | Render |  |

**Frontend** is deployed via Vercel with automatic deploys triggered on push to the `main` branch. Build command: `npm run build`. Output directory: `dist`.

**Backend** is deployed via Render with automatic deploys from its own repository. The free tier may cause a cold start delay of up to 50 seconds on the first request after inactivity.

---

## Team

| Name | Role | Contributions |
|---|---|---|
| Sarahí Cruz | Product Owner | Requirements definition, backlog management, feature validation, product QA |
| Miguel Ángel Restrepo | QA / Developer / Team Leader | Frontend architecture, swaps module, real-time chat, notifications, memberships, checkout, technical leadership |
| Kevin Uribe | Developer | Frontend components, API integration, authentication system, profile views |
| Juan David Santamaría | Scrum Master | SCRUM ceremonies, Azure DevOps management, team coordination, project documentation |

---

## References

The following resources, documentation sources, and external APIs were consulted or integrated during development:

**Official Documentation**

- MDN Web Docs — JavaScript, WebSockets, Fetch API, localStorage, sessionStorage:  
  https://developer.mozilla.org/en-US/docs/Web/API
- MDN — WebSocket API:  
  https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN — Notifications API:  
  https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- Vite — Environment Variables and Modes:  
  https://vitejs.dev/guide/env-and-mode
- Vite — Getting Started:  
  https://vitejs.dev/guide
- JSON Server — Full Fake REST API:  
  https://github.com/typicode/json-server
- JWT.io — JSON Web Tokens Introduction:  
  https://jwt.io/introduction

**External Libraries and CDNs**

- Ionicons 7 — Icon library by Ionic:  
  https://ionic.io/ionicons
- Spline — 3D design and viewer for the web:  
  https://spline.design
- Spline Viewer web component:  
  https://unpkg.com/@splinetool/viewer@1.12.69/build/spline-viewer.js
- Google Fonts — Montserrat and Roboto:  
  https://fonts.google.com

**Deployment Platforms**

- Vercel — Frontend deployment:  
  https://vercel.com/docs
- Render — Backend deployment:  
  https://render.com/docs

**Design and UI References**

- CSS Gradient Generator:  
  https://cssgradient.io
- Mastercard logo (Wikimedia Commons, SVG):  
  https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg
- Shields.io — README badges:  
  https://shields.io

**Methodology**

- Scrum Guide 2020 — Schwaber & Sutherland:  
  https://scrumguides.org/scrum-guide.html
- Azure DevOps Documentation:  
  https://learn.microsoft.com/en-us/azure/devops

---

## JSON Server Setup

The checkout module persists payment records to a local `db.json` file during development. To run JSON Server on port 3001:

### Install JSON Server globally
```bash
npm install -g json-server
```

### Start the server
```bash
npx json-server --watch db.json --port 3001
```

Or if installed globally:
```bash
json-server --watch db.json --port 3001
```

The mock API will be available at:
```
http://localhost:3001/payments
```

### db.json structure
```json
{
  "payments": [
    {
      "id": "1",
      "customerName": "Juan Perez",
      "plan": "Emerald",
      "amount": "$12.000",
      "date": "14 de marzo de 2026",
      "cardType": "VISA"
    }
  ],
  "users": []
}
```

> JSON Server must be running in a separate terminal alongside `npm run dev` for payments to persist locally. If the server is unavailable, the checkout page falls back gracefully to a localStorage-based receipt.

---

*Phantom Team — RIWI 2026 — Learning Swap*

RIWI PROJECT 