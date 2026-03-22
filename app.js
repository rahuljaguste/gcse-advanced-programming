// ===== STATE (Redis-backed via API) =====
let currentStudent = '';
let progressCache = {};  // local cache of server state

const API = '';  // same origin

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res.json();
}

// ===== STUDENT LOGIN =====
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function setStudentName(name) {
  currentStudent = name;
  const displayName = capitalize(name);
  document.getElementById('student-display').textContent = displayName;
  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.textContent = displayName;
}

async function promptStudent() {
  let name = localStorage.getItem('student-name');
  if (!name) {
    const overlay = document.getElementById('login-overlay');
    overlay.classList.add('show');
    return;
  }
  setStudentName(name);
  await loadProgress();
}

async function loginStudent(name) {
  name = name.trim().toLowerCase();
  if (!name) return;
  try {
    const res = await api('POST', '/api/register', { name });
    if (res.error) {
      // Fix #20: Show validation error to user
      const errEl = document.getElementById('login-error');
      if (errEl) { errEl.textContent = res.error; errEl.style.display = 'block'; }
      return;
    }
    localStorage.setItem('student-name', name);
    setStudentName(name);
    document.getElementById('login-overlay').classList.remove('show');
    await loadProgress();
  } catch (err) {
    const errEl = document.getElementById('login-error');
    if (errEl) { errEl.textContent = 'Cannot connect to server.'; errEl.style.display = 'block'; }
  }
}

function logoutStudent() {
  localStorage.removeItem('student-name');
  currentStudent = '';
  progressCache = {};
  document.getElementById('login-overlay').classList.add('show');
}

// ===== PROGRESS (Redis-backed) =====
async function loadProgress() {
  if (!currentStudent) return;
  const data = await api('GET', `/api/progress/${currentStudent}`);
  progressCache = {};
  // Convert chapters object to simple boolean map
  if (data.chapters) {
    Object.keys(data.chapters).forEach(ch => {
      progressCache[ch] = true;
    });
  }
  updateProgressUI();
}

function updateProgressUI() {
  const total = document.querySelectorAll('.nav-item[data-chapter]:not([data-chapter="home"])').length;
  const done = Object.keys(progressCache).filter(k => progressCache[k]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const fill = document.querySelector('.progress-fill');
  if (fill) fill.style.width = pct + '%';

  const label = document.querySelector('.progress-bar-container label');
  if (label) label.textContent = `Progress: ${pct}% (${done}/${total})`;

  // Update nav checkmarks
  document.querySelectorAll('.nav-item[data-chapter]').forEach(item => {
    const ch = item.dataset.chapter;
    const check = item.querySelector('.check');
    if (check) {
      if (progressCache[ch]) {
        check.classList.add('done');
        check.textContent = '✓';
      } else {
        check.classList.remove('done');
        check.textContent = '';
      }
    }
  });

  // Update complete buttons
  document.querySelectorAll('.chapter-complete-btn').forEach(btn => {
    const ch = btn.dataset.chapter;
    if (progressCache[ch]) {
      btn.textContent = '✓ Completed!';
      btn.classList.add('completed');
    } else {
      btn.textContent = '✓ Mark as Complete';
      btn.classList.remove('completed');
    }
  });
}

async function toggleComplete(chapterId) {
  const wasCompleted = !!progressCache[chapterId];
  const nowCompleted = !wasCompleted;

  // Optimistic UI update
  if (nowCompleted) {
    progressCache[chapterId] = true;
  } else {
    delete progressCache[chapterId];
  }
  updateProgressUI();

  if (nowCompleted) {
    showToast('Chapter completed! Keep going!');
  }

  // Persist to Redis via API, rollback on failure
  try {
    await api('POST', `/api/progress/${currentStudent}`, {
      chapter: chapterId,
      completed: nowCompleted
    });
  } catch (err) {
    if (wasCompleted) {
      progressCache[chapterId] = true;
    } else {
      delete progressCache[chapterId];
    }
    updateProgressUI();
    showToast('Failed to save — check your connection.');
  }

  // Fix #6: Dispatch event so features.js can refresh badges
  document.dispatchEvent(new CustomEvent('chapter-toggled', { detail: { chapter: chapterId } }));
}

// ===== NAVIGATION =====
function navigateTo(chapterId) {
  document.querySelectorAll('.chapter').forEach(ch => ch.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));

  const target = document.getElementById(chapterId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0 });
  }

  const navItem = document.querySelector(`.nav-item[data-chapter="${chapterId}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('sidebar').classList.remove('open');
}

// ===== TOAST =====
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-text').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== COPY CODE =====
function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block').querySelector('code');
      const text = codeBlock.textContent;

      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  });
}

// ===== QUIZZES =====
function setupQuizzes() {
  document.querySelectorAll('.quiz-option').forEach(option => {
    option.addEventListener('click', function() {
      const question = this.closest('.quiz-question');
      if (question.classList.contains('answered')) return;

      question.classList.add('answered');
      const allOptions = question.querySelectorAll('.quiz-option');
      const correct = question.dataset.answer;

      allOptions.forEach(opt => {
        opt.classList.add('disabled');
        if (opt.dataset.value === correct) opt.classList.add('correct');
      });

      if (this.dataset.value !== correct) this.classList.add('wrong');

      // Check if all questions in this quiz are answered
      const quiz = question.closest('.quiz');
      const allQuestions = quiz.querySelectorAll('.quiz-question');
      const answeredQuestions = quiz.querySelectorAll('.quiz-question.answered');

      if (allQuestions.length === answeredQuestions.length) {
        let score = 0;
        allQuestions.forEach(q => {
          const wrongSelected = q.querySelector('.quiz-option.wrong');
          if (!wrongSelected) score++;
        });

        const scoreEl = quiz.querySelector('.quiz-score');
        const pct = Math.round((score / allQuestions.length) * 100);
        scoreEl.textContent = `Score: ${score}/${allQuestions.length} (${pct}%)`;

        if (pct >= 80) {
          scoreEl.className = 'quiz-score show great';
          scoreEl.textContent += ' — Excellent!';
        } else if (pct >= 50) {
          scoreEl.className = 'quiz-score show ok';
          scoreEl.textContent += ' — Good effort! Review the ones you missed.';
        } else {
          scoreEl.className = 'quiz-score show retry';
          scoreEl.textContent += ' — Re-read the chapter and try again!';
        }

        // Save quiz score to Redis
        const chapterSection = quiz.closest('.chapter');
        if (chapterSection && currentStudent) {
          api('POST', `/api/quiz/${currentStudent}`, {
            chapter: chapterSection.id,
            score: score,
            total: allQuestions.length
          });
        }
      }
    });
  });

  // Reset buttons
  document.querySelectorAll('.quiz-reset').forEach(btn => {
    btn.addEventListener('click', function() {
      const quiz = this.closest('.quiz');
      quiz.querySelectorAll('.quiz-question').forEach(q => {
        q.classList.remove('answered');
        q.querySelectorAll('.quiz-option').forEach(opt => {
          opt.classList.remove('correct', 'wrong', 'disabled');
        });
      });
      const scoreEl = quiz.querySelector('.quiz-score');
      scoreEl.className = 'quiz-score';
      scoreEl.textContent = '';
    });
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.chapter));
  });

  // Complete buttons
  document.querySelectorAll('.chapter-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleComplete(btn.dataset.chapter));
  });

  // Prev/Next buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.target) navigateTo(btn.dataset.target);
    });
  });

  // Welcome cards
  document.querySelectorAll('.welcome-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.chapter) navigateTo(card.dataset.chapter);
    });
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('student-name-input');
      loginStudent(nameInput.value);
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutStudent);
  }

  setupCopyButtons();
  setupQuizzes();
  setupSyntaxHighlighting();

  // Set assignment links to point to the correct tab
  document.querySelectorAll('.assignment-link').forEach(link => {
    const chapter = link.closest('.chapter');
    if (chapter) {
      link.href = '/assignments#' + chapter.id;
    }
  });

  // Show home by default
  navigateTo('home');

  // Prompt for student login
  promptStudent();
});

// ===== SYNTAX HIGHLIGHTING =====
function setupSyntaxHighlighting() {
  document.querySelectorAll('.code-block').forEach(block => {
    const header = block.querySelector('.code-header span');
    const codeEl = block.querySelector('code');
    if (!codeEl) return;

    const label = header ? header.textContent.toLowerCase() : '';
    if (label.includes('pseudo')) {
      codeEl.classList.add('language-none');
    } else {
      codeEl.classList.add('language-python');
    }
  });

  // Add line numbers BEFORE Prism runs (so line count is correct)
  document.querySelectorAll('.code-block pre').forEach(pre => {
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;
    const lines = codeEl.textContent.split('\n');
    if (lines[lines.length - 1].trim() === '') lines.pop();
    const count = lines.length;

    pre.classList.add('has-line-numbers');
    const gutter = document.createElement('span');
    gutter.className = 'line-numbers-gutter';
    gutter.setAttribute('aria-hidden', 'true');
    gutter.innerHTML = Array.from({length: count}, (_, i) => `<span>${i + 1}</span>`).join('');
    pre.appendChild(gutter);
  });

  // Run Prism AFTER classes are added and line numbers are set
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }
}
