# SehatMitra - AI Health Triage Assistant

SehatMitra is a single-page offline web application designed to help rural communities with instant health triage guidance. By simply describing symptoms, users receive advice on whether to rest at home, visit a clinic, or go to the hospital immediately.

## 🚀 Features

- **Offline Functionality**: Built entirely with HTML, CSS, and vanilla JavaScript. It works completely offline directly in the browser without any backend servers or APIs.
- **Adaptive Triage Engine**: Detects symptoms from user input and dynamically asks relevant follow-up questions (e.g., duration, severity, age) to determine the risk level.
- **Input Validation**: Gracefully handles random or non-symptom-related text by prompting the user for clearer medical descriptions, rather than attempting triage on invalid input.
- **3 Risk Levels**: 
  - 🚨 **HIGH RISK**: Immediate hospital visit needed.
  - ⚠️ **MEDIUM RISK**: Visit a clinic or primary health center today.
  - ✅ **LOW RISK**: Home care instructions.
- **Beautiful UI/UX**: Dark mode aesthetic, glassmorphism chat panel, quick reply buttons, and responsive design across desktop and mobile.
- **Voice Input**: Supports capturing symptoms using voice via the Web Speech API (in supported browsers).

## 🛠️ Technology Stack

- **HTML5**: File structure and semantic content.
- **CSS3**: Styling, responsive design, animations, variables, and dark UI theme.
- **Vanilla JavaScript**: Logic for symptom parsing, adaptive questionnaire, triage engine, input validation, and speech recognition.

## 📂 Project Structure

- `index.html`: The main landing page and entry point of the app.
- `style.css`: All the styling rules and animations.
- `script.js`: The core logic driving the chatbot, triage engine, and symptom validation.

## 🏃 Setup & Usage

Since this is a client-side only application, setup is incredibly straightforward:

1. Clone or download this directory.
2. Open `index.html` in any modern web browser.
3. Start interacting with SehatMitra!
   - *(Optional)* For seamless local testing, you can also spin up a quick static server from the directory: `python -m http.server 8080` and visit `http://localhost:8080`.

## ✨ How it Works

1. **Describe Symptoms**: The user types (or speaks) what they are feeling.
2. **Answer Follow-ups**: The AI asks adaptive questions depending on severity of the initial combined symptoms. 
3. **Get Guidance**: The triage engine processes all inputs to generate a clear actionable risk level card.
