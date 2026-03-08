// ============================================================
//  SehatMitra AI – Adaptive Triage Chat Engine
//  Questions are dynamically selected based on symptoms.
//  Mild symptoms → fewer questions. Severe → more questions.
// ============================================================

// ============================================================
//  SYMPTOM KEYWORD MAP
// ============================================================
const KEYWORD_MAP = {
  fever:            ['fever','temperature','hot','burning','bukhar','tez tapman','pyrexia'],
  cough:            ['cough','coughing','khansi','throat'],
  breathingDiff:    ['breath','breathing','breathe','suffocate','saans','cant breathe',"can't breathe",'short of breath','gasping'],
  chestPain:        ['chest pain','chest','tightness','heart pain','dil dard','angina','pressure in chest'],
  vomiting:         ['vomit','vomiting','nausea','throwing up','ulti','nauseous'],
  diarrhea:         ['diarrhea','diarrhoea','loose motion','loose stool','dast'],
  headache:         ['headache','head pain','migraine','sir dard','head ache'],
  bleeding:         ['bleed','bleeding','blood','khoon','hemorrhage','haemorrhage'],
  unconscious:      ['unconscious','faint','fainting','passed out','collapse','behosh','unresponsive','blackout'],
  rash:             ['rash','rashes','itching','itch','skin','hives','spots','blisters'],
  eyePain:          ['eye pain','eye',' eyes','blurred vision','vision','blurry'],
  jointPain:        ['joint','joints','bone pain','body ache','body pain','muscles','muscle pain'],
  urination:        ['urination','urine','burning urination','painful urination','frecuent urination','frequent urination'],
  swelling:         ['swelling','swollen','ankle','face swollen','puffiness'],
  dizziness:        ['dizzy','dizziness','vertigo','spinning','lightheaded'],
};

// ============================================================
//  SYMPTOM DISPLAY NAMES  (human-readable labels)
// ============================================================
const SYMPTOM_NAMES = {
  fever:        'Fever',
  cough:        'Cough',
  breathingDiff:'Breathing Difficulty',
  chestPain:    'Chest Pain',
  vomiting:     'Vomiting / Nausea',
  diarrhea:     'Diarrhea / Loose Motion',
  headache:     'Headache',
  bleeding:     'Bleeding',
  unconscious:  'Loss of Consciousness',
  rash:         'Skin Rash / Itching',
  eyePain:      'Eye Pain / Vision Issue',
  jointPain:    'Joint / Body Pain',
  urination:    'Painful Urination',
  swelling:     'Swelling',
  dizziness:    'Dizziness / Vertigo',
};

// ============================================================
//  QUESTION BANK  – all possible follow-up questions
// ============================================================
const Q = {
  age:        { id:'age',        ask:'How old is the patient?', replies:['Below 5 years','5–17 years','18–60 years','Above 60 years'] },
  duration:   { id:'duration',   ask:'How long have these symptoms been present?', replies:['Less than 1 day','1–2 days','3–5 days','More than 5 days'] },
  severity:   { id:'severity',   ask:'How severe is the discomfort? (1 = very mild, 10 = extreme)', replies:['1–3 (Mild)','4–6 (Moderate)','7–9 (Severe)','10 (Extreme)'] },
  breathing:  { id:'breathing',  ask:'Is the patient having any difficulty breathing?', replies:['No difficulty','A little','Yes, quite hard','Cannot breathe properly'] },
  chestPain:  { id:'chestPain',  ask:'Does the patient have chest pain or tightness?', replies:['No','Yes, mild','Yes, severe'] },
  consciousness:{ id:'consciousness', ask:'Is the patient fully awake and responding normally?', replies:['Yes, fully awake','Very weak / drowsy','Unconscious / not responding'] },
  conditions: { id:'conditions', ask:'Does the patient have any known conditions like diabetes, heart disease, or high blood pressure?', replies:['No known conditions','Diabetes','Heart disease','High blood pressure','Not sure'] },
  rash:       { id:'rash',       ask:'Is there a skin rash, itching, or blisters?', replies:['No','Mild itching','Rash / spots on skin','Blisters'] },
  fever_deg:  { id:'fever_deg',  ask:'Has a temperature been measured? Is it above 38.5°C (101°F)?', replies:['Not measured','Below 38.5°C','Above 38.5°C','Very high – above 40°C'] },
  vomit_count:{ id:'vomit_count',ask:'How many times has the patient vomited?', replies:['Once or twice','3–5 times','More than 5 times'] },
};

// ============================================================
//  STATE
// ============================================================
let state = {};
let questionQueue = [];
let currentQIndex = 0;
let symptomsText = '';

function resetState() {
  state = {
    symptoms: {}, rawText: '', age: null, duration: null, severity: null,
    breathing: null, chestPain: null, consciousness: null, conditions: null,
    rash: null, fever_deg: null, vomit_count: null,
  };
  questionQueue = [];
  currentQIndex = 0;
  symptomsText = '';
}

// ============================================================
//  PARSE SYMPTOMS FROM TEXT
// ============================================================
function parseSymptoms(text) {
  const t = text.toLowerCase();
  const found = {};
  for (const [key, words] of Object.entries(KEYWORD_MAP)) {
    if (words.some(w => t.includes(w))) found[key] = true;
  }
  return found;
}

// ============================================================
//  BUILD ADAPTIVE QUESTION QUEUE BASED ON SYMPTOMS
// ============================================================
function buildQuestionQueue(symptoms) {
  const q = [];
  const s = symptoms;

  // --- CRITICAL / EMERGENCY path - ask very few questions
  if (s.unconscious || s.bleeding) {
    q.push(Q.consciousness);
    return q; // that's enough – we can triage immediately after
  }

  if (s.breathingDiff && s.chestPain) {
    q.push(Q.breathing, Q.chestPain);
    return q;
  }

  // --- RESPIRATORY symptoms (fever + cough / breathing trouble)
  if (s.breathingDiff || s.chestPain) {
    q.push(Q.age, Q.duration, Q.severity, Q.breathing, Q.chestPain, Q.consciousness);
    return q;
  }

  // Always ask age and duration if not an emergency
  q.push(Q.age, Q.duration);

  if (s.fever) {
    q.push(Q.fever_deg, Q.severity);
    if (s.cough) q.push(Q.breathing); // fever + cough → ask breathing
    if (s.rash)  q.push(Q.rash);
  }

  if (s.vomiting) {
    q.push(Q.vomit_count);
    if (s.diarrhea) q.push(Q.severity);
  }

  if (s.headache && !s.fever) {
    q.push(Q.severity, Q.dizziness ? Q.dizziness : Q.severity); // just severity
  }

  if (s.jointPain || s.swelling) {
    q.push(Q.severity);
  }

  if (s.rash && !s.fever) {
    q.push(Q.rash);
  }

  if (s.dizziness) {
    q.push(Q.severity, Q.consciousness);
  }

  if (s.eyePain || s.urination) {
    q.push(Q.severity, Q.duration);
  }

  // De-duplicate while preserving order
  const seen = new Set();
  const deduped = [];
  for (const item of q) {
    if (!seen.has(item.id)) { seen.add(item.id); deduped.push(item); }
  }

  // For truly mild cases (cold-like, single mild symptom): just age + duration + severity
  const isMild = !s.fever && !s.breathingDiff && !s.chestPain && !s.vomiting && !s.diarrhea && !s.dizziness;
  if (isMild && deduped.length > 3) {
    return deduped.slice(0, 3);
  }

  return deduped;
}

// ============================================================
//  SEVERITY SCORER
// ============================================================
function scoreSeverity(text) {
  if (!text) return 4;
  const t = text.toLowerCase();
  if (t.includes('10') || t.includes('extreme')) return 10;
  if (t.includes('7') || t.includes('8') || t.includes('9') || t.includes('severe')) return 8;
  if (t.includes('4') || t.includes('5') || t.includes('6') || t.includes('moderate')) return 5;
  return 2;
}

function scoreBreathing(text) {
  if (!text) return 'none';
  const t = text.toLowerCase();
  if (t.includes('cannot') || t.includes("can't") || t.includes('properly') || t.includes('hard')) return 'severe';
  if (t.includes('little') || t.includes('bit') || t.includes('some') || t.includes('quite')) return 'mild';
  return 'none';
}

function scoreConsciousness(text) {
  if (!text) return 'normal';
  const t = text.toLowerCase();
  if (t.includes('uncons') || t.includes('not respond') || t.includes('behosh')) return 'unconscious';
  if (t.includes('weak') || t.includes('drowsy')) return 'weak';
  return 'normal';
}

// ============================================================
//  TRIAGE ENGINE
// ============================================================
function triage() {
  const s = state.symptoms;
  const sev = scoreSeverity(String(state.severity || ''));
  const breath = scoreBreathing(String(state.breathing || ''));
  const consciousness = scoreConsciousness(String(state.consciousness || ''));

  // IMMEDIATE HIGHS
  if (s.unconscious || consciousness === 'unconscious') {
    return { level:'HIGH', concern:'Patient is unconscious / unresponsive', action:'🚨 EMERGENCY — Call for help and take the patient to the hospital IMMEDIATELY.' };
  }
  if (s.bleeding) {
    return { level:'HIGH', concern:'Heavy or uncontrolled bleeding', action:'🚨 Apply pressure to the wound and go to the hospital IMMEDIATELY.' };
  }
  if (breath === 'severe' || (s.breathingDiff && s.chestPain)) {
    return { level:'HIGH', concern:'Severe breathing difficulty or chest pain', action:'🚨 This is an emergency. Go to the nearest hospital NOW. Do not wait.' };
  }
  if (sev >= 9) {
    return { level:'HIGH', concern:'Extreme pain or discomfort reported', action:'Please go to the hospital immediately. Severity is very high.' };
  }

  // HIGH from combinations
  if (s.chestPain && state.chestPain && String(state.chestPain).toLowerCase().includes('severe')) {
    return { level:'HIGH', concern:'Severe chest pain', action:'Go to the hospital immediately — this could be a heart-related emergency.' };
  }
  if (sev >= 7 || consciousness === 'weak') {
    return { level:'HIGH', concern:'Severe symptoms with high intensity', action:'Please visit the nearest hospital today. Do not delay.' };
  }

  // MEDIUM RISK
  if (breath === 'mild' || sev >= 5) {
    return { level:'MEDIUM', concern:'Moderate symptoms requiring medical evaluation', action:'Visit your nearest clinic or primary health center today.' };
  }
  if (s.fever && s.cough && sev >= 4) {
    return { level:'MEDIUM', concern:'Fever with cough — possible respiratory infection', action:'Visit your nearest clinic. A doctor checkup is recommended.' };
  }
  if (state.fever_deg && (String(state.fever_deg).includes('above 38') || String(state.fever_deg).includes('very high') || String(state.fever_deg).includes('40'))) {
    return { level:'MEDIUM', concern:'High fever detected', action:'Visit a clinic or health center. High fever needs medical attention.' };
  }
  if (s.vomiting && state.vomit_count && !String(state.vomit_count).toLowerCase().includes('once')) {
    return { level:'MEDIUM', concern:'Repeated vomiting — risk of dehydration', action:'Visit a clinic. Keep drinking fluids while you travel.' };
  }
  if (s.diarrhea && s.vomiting) {
    return { level:'MEDIUM', concern:'Vomiting and diarrhea — dehydration risk', action:'Visit a clinic. Drink oral rehydration solution (ORS) in the meantime.' };
  }
  if (s.swelling) {
    return { level:'MEDIUM', concern:'Unexplained swelling', action:'Visit a clinic to rule out serious causes.' };
  }

  // LOW RISK
  if (s.fever && sev <= 3) {
    return { level:'LOW', concern:'Mild fever', action:'Rest at home, drink plenty of water, take paracetamol if needed. Monitor for 1–2 days. Visit clinic if fever rises above 38.5°C or lasts more than 3 days.' };
  }
  if (s.headache && sev <= 4) {
    return { level:'LOW', concern:'Mild headache', action:'Rest, drink water, avoid screens. If headache is severe or lasts more than 2 days, visit a clinic.' };
  }
  if (s.cough && !s.fever && sev <= 3) {
    return { level:'LOW', concern:'Mild cough or cold', action:'Rest, drink warm fluids, honey with ginger may help. See a doctor if cough persists more than 5 days.' };
  }
  if (s.rash && sev <= 3) {
    return { level:'LOW', concern:'Mild skin rash or irritation', action:'Keep area clean and dry. Avoid scratching. Visit a clinic if rash spreads or worsens.' };
  }
  if (s.jointPain && sev <= 4) {
    return { level:'LOW', concern:'Mild joint or muscle pain', action:'Rest the affected area. Warm compress may help. Visit a clinic if pain persists beyond 3 days.' };
  }

  // Default fallback
  return {
    level:'LOW',
    concern:'Mild or common symptoms',
    action:'Rest at home, stay hydrated, and monitor your symptoms. Visit a nearby clinic if anything worsens.'
  };
}

// ============================================================
//  RESULT CARD HTML
// ============================================================
function buildResultHTML(result) {
  const cls = result.level === 'HIGH' ? 'high' : result.level === 'MEDIUM' ? 'medium' : 'low';
  const emoji = result.level === 'HIGH' ? '🚨' : result.level === 'MEDIUM' ? '⚠️' : '✅';
  return `
    <div class="result-bubble">
      <div class="result-row">
        <span class="result-label">Risk Level:</span>
        <span class="risk-tag ${cls}">${emoji} ${result.level} RISK</span>
      </div>
      <div class="result-row">
        <span class="result-label">Concern:</span>
        <span class="result-value">${result.concern}</span>
      </div>
      <div class="result-row" style="align-items:flex-start;">
        <span class="result-label">Action:</span>
        <span class="result-value" style="font-weight:500;">${result.action}</span>
      </div>
    </div>`;
}

// ============================================================
//  DOM HELPERS
// ============================================================
const chatMessages  = document.getElementById('chatMessages');
const typingEl      = document.getElementById('typingIndicator');
const quickRepliesEl= document.getElementById('quickReplies');
const userInput     = document.getElementById('userInput');
const sendBtn       = document.getElementById('sendBtn');
const resetBtn      = document.getElementById('resetBtn');
const micBtn        = document.getElementById('micBtn');

function scrollBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
function showTyping()   { typingEl.style.display = 'flex'; scrollBottom(); }
function hideTyping()   { typingEl.style.display = 'none'; }

function setQuickReplies(replies = []) {
  quickRepliesEl.innerHTML = '';
  replies.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = r;
    btn.addEventListener('click', () => sendMessage(r));
    quickRepliesEl.appendChild(btn);
  });
}

function appendMsg(role, text, isHTML = false) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;
  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = role === 'ai' ? '🤖' : '👤';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (isHTML) bubble.innerHTML = text;
  else bubble.innerHTML = text.replace(/\n/g, '<br>');
  wrap.appendChild(av);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  scrollBottom();
}

function aiSay(text, replies = [], delay = 800) {
  showTyping();
  setTimeout(() => {
    hideTyping();
    appendMsg('ai', text);
    setQuickReplies(replies);
    scrollBottom();
  }, delay);
}

function appendResultCard(result) {
  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = '🤖';
  wrap.appendChild(av);
  const card = document.createElement('div');
  card.innerHTML = buildResultHTML(result);
  wrap.appendChild(card);
  chatMessages.appendChild(wrap);
  scrollBottom();
}

// ============================================================
//  PROCESS ANSWER & ADVANCE FLOW
// ============================================================
function storeAnswer(qId, answer) {
  switch (qId) {
    case 'age':          state.age = answer; break;
    case 'duration':     state.duration = answer; break;
    case 'severity':     state.severity = answer; break;
    case 'breathing':    state.breathing = answer; break;
    case 'chestPain':    state.chestPain = answer; break;
    case 'consciousness':state.consciousness = answer; break;
    case 'conditions':   state.conditions = answer; break;
    case 'rash':         state.rash = answer; break;
    case 'fever_deg':    state.fever_deg = answer; break;
    case 'vomit_count':  state.vomit_count = answer; break;
  }
}

function checkEmergencyEarlyExit(qId, answer) {
  const a = answer.toLowerCase();
  // Breathing severe → immediate result
  if (qId === 'breathing' && (a.includes('cannot') || a.includes("can't") || a.includes('properly') || a.includes('hard'))) {
    showResult({ level:'HIGH', concern:'Severe breathing difficulty', action:'🚨 This is an emergency. Go to the hospital IMMEDIATELY.' });
    return true;
  }
  // Unconscious → immediate result
  if (qId === 'consciousness' && (a.includes('uncons') || a.includes('not respond'))) {
    showResult({ level:'HIGH', concern:'Patient is unconscious / unresponsive', action:'🚨 Call for help and take to hospital IMMEDIATELY.' });
    return true;
  }
  // Severity 10 → immediate result
  if (qId === 'severity' && (a.includes('10') || a.includes('extreme'))) {
    showResult({ level:'HIGH', concern:'Extreme pain reported', action:'Please go to the hospital immediately. Severity is dangerously high.' });
    return true;
  }
  return false;
}

function showResult(result) {
  setQuickReplies([]);
  showTyping();
  setTimeout(() => {
    hideTyping();
    appendMsg('ai', 'Thank you. Based on the information provided, here is my assessment:');
    setTimeout(() => {
      appendResultCard(result);
      setTimeout(() => {
        appendMsg('ai', '⚠️ This is triage guidance only — not a medical diagnosis.\nAlways consult a qualified doctor for proper treatment.\n\nWould you like to start a new consultation?');
        setQuickReplies(['Start New Consultation']);
      }, 600);
    }, 400);
  }, 900);
}

function advanceFlow(userText) {
  // If there are questions remaining, store the current answer and ask next
  if (currentQIndex < questionQueue.length) {
    const currentQ = questionQueue[currentQIndex];
    storeAnswer(currentQ.id, userText);

    // Check for early emergency exit
    if (checkEmergencyEarlyExit(currentQ.id, userText)) return;

    currentQIndex++;

    if (currentQIndex < questionQueue.length) {
      const next = questionQueue[currentQIndex];
      aiSay(next.ask, next.replies);
    } else {
      // All questions answered → triage
      const result = triage();
      showResult(result);
    }
    return;
  }
  // Fallback (shouldn't happen)
  const result = triage();
  showResult(result);
}

// ============================================================
//  HANDLE FIRST MESSAGE (symptoms)
// ============================================================
function handleSymptoms(text) {
  symptomsText = text;
  state.rawText = text;

  // --- STEP 3: Minimum input check (< 2 words) ---
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    aiSay(
      'Please describe your symptoms in a little more detail so I can help you better.\n\n'
      + 'For example:\n'
      + '• "I have fever and headache"\n'
      + '• "Mujhe bukhar aur khansi hai"\n'
      + '• "I feel chest pain while breathing"',
      ['Fever and cough','Headache','Stomach pain','Chest pain','Vomiting']
    );
    return; // chatPhase stays 'symptoms' — user can retry
  }

  // --- STEP 1: Detect symptoms ---
  state.symptoms = parseSymptoms(text);
  const s = state.symptoms;
  const detectedKeys = Object.keys(s);

  // --- STEP 2: No valid symptoms detected ---
  if (detectedKeys.length === 0) {
    aiSay(
      "I couldn't identify any health symptoms in your message. 🤔\n\n"
      + 'Please describe what health problem you or the patient is experiencing.\n\n'
      + 'Examples:\n'
      + '• I have fever and cough\n'
      + '• Mujhe bukhar aur khansi hai\n'
      + '• I feel chest pain while breathing\n'
      + '• Headache and dizziness since yesterday',
      ['Fever and cough','Headache','Stomach pain','Chest pain','Vomiting']
    );
    return; // chatPhase stays 'symptoms' — user can retry
  }

  // --- STEP 4: Show detected symptoms before starting questions ---
  const nameList = detectedKeys.map(k => '  • ' + (SYMPTOM_NAMES[k] || k)).join('\n');
  appendMsg('ai',
    'Detected symptoms:\n' + nameList + '\n\nLet me ask a few quick questions to assess the situation.');

  // Only now advance to questions phase
  chatPhase = 'questions';

  // IMMEDIATE EMERGENCY: no questions needed
  if (s.unconscious) {
    setTimeout(() => showResult({ level:'HIGH', concern:'Possible loss of consciousness / emergency', action:'🚨 EMERGENCY — Take the patient to the nearest hospital IMMEDIATELY. Call emergency services.' }), 800);
    return;
  }
  if (s.bleeding && (text.toLowerCase().includes('heavy') || text.toLowerCase().includes('much') || text.toLowerCase().includes('lot'))) {
    setTimeout(() => showResult({ level:'HIGH', concern:'Heavy or severe bleeding', action:'🚨 Apply firm pressure to the wound and go to hospital IMMEDIATELY.' }), 800);
    return;
  }

  // Build the adaptive question queue
  questionQueue = buildQuestionQueue(s);

  if (questionQueue.length === 0) {
    // No questions needed → triage directly
    setTimeout(() => { const result = triage(); showResult(result); }, 800);
    return;
  }

  // Ask first question (slight delay so detected-symptoms message is visible)
  setTimeout(() => {
    const first = questionQueue[0];
    aiSay(first.ask, first.replies);
  }, 1000);
}

// ============================================================
//  SEND MESSAGE
// ============================================================
let chatPhase = 'symptoms'; // 'symptoms' | 'questions' | 'done'

function sendMessage(text) {
  text = (text || userInput.value).trim();
  if (!text) return;
  userInput.value = '';
  autoResize();
  quickRepliesEl.innerHTML = '';
  appendMsg('user', text);

  if (text.toLowerCase().includes('new consultation') || text.toLowerCase() === 'reset') {
    setTimeout(() => resetChat(), 400);
    return;
  }

  if (chatPhase === 'symptoms') {
    // Note: chatPhase is advanced to 'questions' inside handleSymptoms()
    // only when valid symptoms are detected. Bad input keeps phase as 'symptoms'.
    handleSymptoms(text);
    return;
  }

  if (chatPhase === 'questions') {
    advanceFlow(text);
    return;
  }
}

// ============================================================
//  RESET
// ============================================================
function resetChat() {
  resetState();
  chatPhase = 'symptoms';
  chatMessages.innerHTML = '';
  setQuickReplies([]);
  userInput.value = '';
  setTimeout(() => {
    aiSay(
      'Hello! I am SehatMitra, your AI health assistant.\n\nPlease tell me — what symptoms is the patient experiencing right now?',
      ['Fever and cough','Stomach pain','Headache','Breathing difficulty','Body ache','Vomiting'],
      500
    );
  }, 200);
}

// ============================================================
//  TEXTAREA AUTO-RESIZE
// ============================================================
function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}
userInput.addEventListener('input', autoResize);
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ============================================================
//  EVENTS
// ============================================================
sendBtn.addEventListener('click', () => sendMessage());
resetBtn.addEventListener('click', () => resetChat());

// ============================================================
//  VOICE INPUT
// ============================================================
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new SR();
  let listening = false;
  recog.continuous = false;
  recog.lang = 'en-IN';
  recog.onresult = e => {
    userInput.value = e.results[0][0].transcript;
    autoResize();
    micBtn.classList.remove('listening');
    listening = false;
  };
  recog.onerror = recog.onend = () => { micBtn.classList.remove('listening'); listening = false; };
  micBtn.addEventListener('click', () => {
    if (listening) { recog.stop(); } else { recog.start(); micBtn.classList.add('listening'); listening = true; }
  });
} else {
  micBtn.style.opacity = '0.35';
  micBtn.style.cursor = 'not-allowed';
  micBtn.title = 'Voice input not supported in this browser';
}

// ============================================================
//  SMOOTH SCROLL
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth' }); }
  });
});

// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  resetState();
  setTimeout(() => {
    aiSay(
      'Hello! I am SehatMitra, your AI health assistant.\n\nPlease tell me — what symptoms is the patient experiencing right now?',
      ['Fever and cough','Stomach pain','Headache','Breathing difficulty','Body ache','Vomiting'],
      500
    );
  }, 400);
});
