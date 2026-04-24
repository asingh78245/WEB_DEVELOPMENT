/* ===========================
   PlacePro — script.js
   Handles: Navigation, Quiz Logic, API calls, Tips & Roadmap
   =========================== */

// ---- State ----
let currentSection = 'home';
let currentCategory = '';
let questions = [];
let currentQuestion = 0;
let userAnswers = {};
let timerInterval = null;
let timeLeft = 300; // 5 minutes in seconds

// ---- Navigation ----
function navigateTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const target = document.getElementById(section);
  if (target) target.classList.add('active');

  const activeLink = document.querySelector(`[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');

  currentSection = section;
  window.scrollTo(0, 0);

  // Load section data on demand
  if (section === 'tips') loadTips();
  if (section === 'roadmap') loadRoadmap();
}

// Nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
    // Close mobile menu
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// Hamburger
document.getElementById('hamburger').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('open');
});

// ---- QUIZ ----

// Category card clicks
document.querySelectorAll('.quiz-cat-card').forEach(card => {
  card.addEventListener('click', () => {
    startQuiz(card.dataset.cat);
  });
});

async function startQuiz(category) {
  currentCategory = category;
  userAnswers = {};
  currentQuestion = 0;

  try {
    const res = await fetch(`/api/quiz/${category}`);
    const data = await res.json();
    questions = data.questions;

    // Show quiz interface
    document.getElementById('quiz-home').classList.add('hidden');
    document.getElementById('quiz-interface').classList.remove('hidden');
    document.getElementById('quiz-results').classList.add('hidden');

    document.getElementById('quiz-category-label').textContent = category;
    renderQuestion();
    startTimer();
  } catch (err) {
    console.error('Failed to load quiz:', err);
    alert('Failed to load quiz. Please check that Flask server is running.');
  }
}

function renderQuestion() {
  const q = questions[currentQuestion];
  const total = questions.length;

  // Progress
  document.getElementById('question-counter').textContent = `Q ${currentQuestion + 1}/${total}`;
  document.getElementById('q-number').textContent = `Question ${currentQuestion + 1}`;
  document.getElementById('q-text').textContent = q.question;
  document.getElementById('quiz-progress-bar').style.width = `${((currentQuestion + 1) / total) * 100}%`;

  // Options
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];

  q.options.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    if (userAnswers[q.id] === i) btn.classList.add('selected');

    btn.innerHTML = `<span class="option-label">${labels[i]}</span>${option}`;
    btn.addEventListener('click', () => selectOption(q.id, i, btn, container));
    container.appendChild(btn);
  });

  // Nav buttons
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');

  prevBtn.disabled = currentQuestion === 0;

  if (currentQuestion === total - 1) {
    nextBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
    submitBtn.classList.add('hidden');
  }
}

function selectOption(qId, optIndex, clickedBtn, container) {
  userAnswers[qId] = optIndex;
  container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  clickedBtn.classList.add('selected');
}

// Prev / Next / Submit
document.getElementById('prev-btn').addEventListener('click', () => {
  if (currentQuestion > 0) { currentQuestion--; renderQuestion(); }
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (currentQuestion < questions.length - 1) { currentQuestion++; renderQuestion(); }
});

document.getElementById('submit-btn').addEventListener('click', submitQuiz);

document.getElementById('back-to-categories').addEventListener('click', () => {
  clearInterval(timerInterval);
  resetQuizView();
});

async function submitQuiz() {
  clearInterval(timerInterval);

  const payload = {
    category: currentCategory,
    answers: userAnswers
  };

  try {
    const res = await fetch('/api/submit-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    showResults(data);
  } catch (err) {
    console.error('Failed to submit quiz:', err);
    alert('Submission failed. Is Flask running?');
  }
}

function showResults(data) {
  document.getElementById('quiz-interface').classList.add('hidden');
  document.getElementById('quiz-results').classList.remove('hidden');

  document.getElementById('score-percentage').textContent = `${data.percentage}%`;
  document.getElementById('correct-count').textContent = data.score;
  document.getElementById('wrong-count').textContent = data.total - data.score;
  document.getElementById('total-count').textContent = data.total;

  // Feedback message
  let msg = '';
  if (data.percentage >= 80) msg = '🏆 Excellent! You are placement-ready!';
  else if (data.percentage >= 60) msg = '👍 Good job! Keep practicing.';
  else msg = '💪 Keep going! Review the explanations below.';
  document.getElementById('results-message').textContent = msg;

  // Detailed review
  const review = document.getElementById('answers-review');
  review.innerHTML = '<h3 style="margin-bottom:0.5rem;font-family:var(--font-display)">Answer Review</h3>';

  const labels = ['A', 'B', 'C', 'D'];
  data.results.forEach(r => {
    const div = document.createElement('div');
    div.className = `review-item ${r.is_correct ? 'correct-item' : 'wrong-item'}`;

    const icon = r.is_correct ? '✅' : '❌';
    const userAns = r.user_answer >= 0 ? labels[r.user_answer] : 'Not answered';
    const correctAns = labels[r.correct_answer];

    div.innerHTML = `
      <div class="review-q">${icon} ${r.question}</div>
      <div class="review-meta">Your answer: <strong>${userAns}</strong> &nbsp;|&nbsp; Correct: <strong>${correctAns}</strong></div>
      <div class="review-exp">💡 ${r.explanation}</div>
    `;
    review.appendChild(div);
  });
}

function resetQuiz() {
  resetQuizView();
}

function resetQuizView() {
  document.getElementById('quiz-home').classList.remove('hidden');
  document.getElementById('quiz-interface').classList.add('hidden');
  document.getElementById('quiz-results').classList.add('hidden');
  currentCategory = '';
  questions = [];
  userAnswers = {};
  currentQuestion = 0;
  timeLeft = 300;
}

// ---- Timer ----
function startTimer() {
  timeLeft = 300;
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert('⏰ Time is up! Submitting your quiz.');
      submitQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${m}:${s}`;

  const timerBox = document.querySelector('.timer-box');
  if (timeLeft <= 60) {
    timerBox.style.background = 'rgba(244,63,94,0.2)';
    timerBox.style.borderColor = 'rgba(244,63,94,0.5)';
  }
}

// ---- TIPS ----
async function loadTips() {
  const container = document.getElementById('tips-container');
  if (container.children.length > 0) return; // Already loaded

  try {
    const res = await fetch('/api/tips');
    const data = await res.json();

    data.tips.forEach(tip => {
      const card = document.createElement('div');
      card.className = 'tip-card';
      card.innerHTML = `
        <div class="tip-icon">${tip.icon}</div>
        <h3>${tip.title}</h3>
        <p>${tip.tip}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted)">Failed to load tips. Is Flask running?</p>';
  }
}

// ---- ROADMAP ----
async function loadRoadmap() {
  const container = document.getElementById('roadmap-container');
  if (container.children.length > 0) return; // Already loaded

  try {
    const res = await fetch('/api/roadmap');
    const data = await res.json();
    const roadmap = data.roadmap;

    const labels = {
      dsa: '📊 Data Structures & Algorithms',
      cs_fundamentals: '🖥️ CS Fundamentals',
      programming: '⌨️ Programming & Projects',
      soft_skills: '🗣️ Soft Skills & HR Prep'
    };

    Object.entries(roadmap).forEach(([key, items]) => {
      const card = document.createElement('div');
      card.className = 'roadmap-card';

      const ul = items.map(item =>
        `<li onclick="toggleDone(this)">${item}</li>`
      ).join('');

      card.innerHTML = `
        <div class="roadmap-card-title">${labels[key] || key}</div>
        <ul>${ul}</ul>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted)">Failed to load roadmap. Is Flask running?</p>';
  }
}

// Toggle done state for roadmap items
function toggleDone(el) {
  el.classList.toggle('done');
}

// ---- HR Questions Accordion ----
function toggleAnswer(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.hr-q').forEach(q => q.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}
