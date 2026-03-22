/**
 * features.js — Visual Diagrams, Code Playground, Badges, Explain-It-Back
 * Injected after DOM load. Enhances existing chapters without editing HTML.
 */

// ═══════════════════════════════════════════════════════════════════════
//  1. VISUAL DIAGRAMS — injected into each chapter after h3 "Key Concepts"
// ═══════════════════════════════════════════════════════════════════════

const DIAGRAMS = {
  ch1: `<div class="diagram">
    <div class="diagram-title">Procedure vs Function</div>
    <div class="diagram-flow">
      <div class="diagram-box proc">
        <div class="db-label">PROCEDURE</div>
        <div class="db-icon">⚙️</div>
        <div class="db-code">greet("Alex")</div>
        <div class="db-arrow">↓</div>
        <div class="db-result">Prints "Hello Alex"</div>
        <div class="db-tag">No return value</div>
      </div>
      <div class="diagram-vs">vs</div>
      <div class="diagram-box func">
        <div class="db-label">FUNCTION</div>
        <div class="db-icon">🔢</div>
        <div class="db-code">add(3, 5)</div>
        <div class="db-arrow">↓</div>
        <div class="db-result">returns 8</div>
        <div class="db-tag">Returns a value</div>
      </div>
    </div>
  </div>`,

  ch2: `<div class="diagram">
    <div class="diagram-title">1D Array — How Indexing Works</div>
    <div class="array-visual">
      <div class="av-label">friends =</div>
      <div class="av-cells">
        <div class="av-cell"><div class="av-idx">0</div><div class="av-val">"Aarav"</div></div>
        <div class="av-cell"><div class="av-idx">1</div><div class="av-val">"Zain"</div></div>
        <div class="av-cell"><div class="av-idx">2</div><div class="av-val">"Lily"</div></div>
        <div class="av-cell"><div class="av-idx">3</div><div class="av-val">"Mia"</div></div>
      </div>
    </div>
    <div class="av-note">friends[0] → "Aarav" &nbsp;|&nbsp; friends[3] → "Mia" &nbsp;|&nbsp; len(friends) → 4</div>
  </div>`,

  ch3: `<div class="diagram">
    <div class="diagram-title">2D Array — Grid with Row & Column</div>
    <div class="grid-visual">
      <div class="gv-corner"></div><div class="gv-colh">Col 0</div><div class="gv-colh">Col 1</div><div class="gv-colh">Col 2</div>
      <div class="gv-rowh">Row 0</div><div class="gv-cell">X</div><div class="gv-cell">O</div><div class="gv-cell">&nbsp;</div>
      <div class="gv-rowh">Row 1</div><div class="gv-cell">&nbsp;</div><div class="gv-cell hl">X</div><div class="gv-cell">&nbsp;</div>
      <div class="gv-rowh">Row 2</div><div class="gv-cell">O</div><div class="gv-cell">&nbsp;</div><div class="gv-cell">X</div>
    </div>
    <div class="av-note">board[1][1] → "X" (highlighted cell)</div>
  </div>`,

  ch4: `<div class="diagram">
    <div class="diagram-title">Array vs Record</div>
    <div class="diagram-flow">
      <div class="diagram-box proc" style="max-width:260px">
        <div class="db-label">ARRAY</div>
        <div class="db-icon">📦</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-key">[0]</span><span class="rf-val">"Aarav"</span></div>
          <div class="rf-row"><span class="rf-key">[1]</span><span class="rf-val">"Zain"</span></div>
          <div class="rf-row"><span class="rf-key">[2]</span><span class="rf-val">"Lily"</span></div>
        </div>
        <div class="db-tag">Same type, access by index</div>
      </div>
      <div class="diagram-vs">vs</div>
      <div class="diagram-box func" style="max-width:260px">
        <div class="db-label">RECORD</div>
        <div class="db-icon">🪪</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-key">name</span><span class="rf-val">"Aarav"</span></div>
          <div class="rf-row"><span class="rf-key">age</span><span class="rf-val">14</span></div>
          <div class="rf-row"><span class="rf-key">score</span><span class="rf-val">92</span></div>
        </div>
        <div class="db-tag">Different types, access by key</div>
      </div>
    </div>
    <div class="av-note">student["name"] → "Aarav" &nbsp;|&nbsp; student["age"] → 14</div>
  </div>`,

  ch5: `<div class="diagram">
    <div class="diagram-title">File Operations Flow</div>
    <div class="flow-diagram">
      <div class="flow-step"><div class="fs-icon">📂</div><div class="fs-text">OPEN<br><small>open("f.txt","a")</small></div></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><div class="fs-icon">✏️</div><div class="fs-text">WRITE / READ<br><small>.write() or .readlines()</small></div></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><div class="fs-icon">🔒</div><div class="fs-text">CLOSE<br><small>.close()</small></div></div>
    </div>
    <div class="flow-modes">
      <span class="fm-tag danger">"w" = overwrite ⚠️</span>
      <span class="fm-tag safe">"a" = append ✓</span>
      <span class="fm-tag info">"r" = read only</span>
    </div>
  </div>`,

  ch6: `<div class="diagram">
    <div class="diagram-title">Random Module — Your Toolbox</div>
    <div class="random-toolbox">
      <div class="rt-item">
        <div class="rt-icon">🎲</div>
        <div class="rt-code">randint(1, 6)</div>
        <div class="rt-desc">Random integer<br>between 1 and 6</div>
        <div class="rt-example">→ 4</div>
      </div>
      <div class="rt-item">
        <div class="rt-icon">👆</div>
        <div class="rt-code">choice(list)</div>
        <div class="rt-desc">Pick one random<br>item from a list</div>
        <div class="rt-example">→ "Lily"</div>
      </div>
      <div class="rt-item">
        <div class="rt-icon">🔀</div>
        <div class="rt-code">shuffle(list)</div>
        <div class="rt-desc">Mix up the list<br>in-place</div>
        <div class="rt-example">→ [3,1,2]</div>
      </div>
      <div class="rt-item">
        <div class="rt-icon">🎰</div>
        <div class="rt-code">random()</div>
        <div class="rt-desc">Decimal between<br>0.0 and 1.0</div>
        <div class="rt-example">→ 0.738</div>
      </div>
    </div>
    <div class="av-note">Always start with: import random</div>
  </div>`,

  ch7: `<div class="diagram">
    <div class="diagram-title">Scope — Where Variables Live</div>
    <div class="scope-house">
      <div class="sh-global">
        <div class="sh-label">🏠 GLOBAL SCOPE (whole house)</div>
        <div class="sh-var">score = 0 &nbsp; lives = 3</div>
        <div class="sh-rooms">
          <div class="sh-room">
            <div class="sh-rlabel">🛏 function add_points()</div>
            <div class="sh-rvar">bonus = 20 <span class="local-tag">LOCAL</span></div>
          </div>
          <div class="sh-room">
            <div class="sh-rlabel">🚿 function lose_life()</div>
            <div class="sh-rvar">msg = "Ouch" <span class="local-tag">LOCAL</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="av-note">Local variables can't be seen outside their room. Global variables are shared.</div>
  </div>`,

  ch8: `<div class="diagram">
    <div class="diagram-title">Validation &amp; Authentication Flow</div>
    <div class="validation-flow">
      <div class="vf-stage">
        <div class="vf-header input-h">📥 USER INPUT</div>
        <div class="vf-body">"Enter your age"</div>
      </div>
      <div class="flow-arrow">↓</div>
      <div class="vf-checks">
        <div class="vf-check">
          <div class="vf-chk-icon">❓</div>
          <div class="vf-chk-name">Presence</div>
          <div class="vf-chk-q">Is it empty?</div>
        </div>
        <div class="vf-check">
          <div class="vf-chk-icon">📏</div>
          <div class="vf-chk-name">Length</div>
          <div class="vf-chk-q">Enough chars?</div>
        </div>
        <div class="vf-check">
          <div class="vf-chk-icon">📊</div>
          <div class="vf-chk-name">Range</div>
          <div class="vf-chk-q">Within limits?</div>
        </div>
      </div>
      <div class="flow-arrow">↓</div>
      <div class="vf-outcomes">
        <div class="vf-outcome pass">✓ VALID → proceed</div>
        <div class="vf-outcome fail">✗ INVALID → ask again</div>
      </div>
    </div>
    <div class="vf-auth-section">
      <div class="vf-header auth-h">🔐 AUTHENTICATION</div>
      <div class="vf-auth-steps">
        <span class="vf-astep">1. Enter username</span>
        <span class="vf-astep">2. Check it exists</span>
        <span class="vf-astep">3. Enter password</span>
        <span class="vf-astep">4. Check it matches</span>
        <span class="vf-astep result">✓ Access granted</span>
      </div>
    </div>
  </div>`,

  ch9: `<div class="diagram">
    <div class="diagram-title">Compiler vs Interpreter</div>
    <div class="translator-compare">
      <div class="tc-col">
        <div class="tc-header comp">⚡ COMPILER</div>
        <div class="tc-step">Source Code (all)</div>
        <div class="tc-arrow">↓ translate ALL</div>
        <div class="tc-step">Executable File (.exe)</div>
        <div class="tc-arrow">↓ run anytime</div>
        <div class="tc-step">Output</div>
        <div class="tc-tag">C++, Java, Rust</div>
      </div>
      <div class="tc-col">
        <div class="tc-header interp">🔄 INTERPRETER</div>
        <div class="tc-step">Line 1 → run</div>
        <div class="tc-arrow">↓</div>
        <div class="tc-step">Line 2 → run</div>
        <div class="tc-arrow">↓</div>
        <div class="tc-step">Line 3 → run ...</div>
        <div class="tc-tag">Python, JavaScript</div>
      </div>
    </div>
  </div>`,

  ch11: `<div class="diagram">
    <div class="diagram-title">Decomposition — Breaking Down a Problem</div>
    <div class="flow-diagram">
      <div class="flow-step" style="min-width:160px"><div class="fs-icon">🎯</div><div class="fs-text">BIG PROBLEM<br><small>"Make a game"</small></div></div>
      <div class="flow-arrow">→</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="flow-step"><div class="fs-text"><small>1. Get player name</small></div></div>
        <div class="flow-step"><div class="fs-text"><small>2. Generate board</small></div></div>
        <div class="flow-step"><div class="fs-text"><small>3. Game loop</small></div></div>
        <div class="flow-step"><div class="fs-text"><small>4. Check winner</small></div></div>
      </div>
    </div>
    <div class="av-note">Each small part is easier to solve, test, and debug</div>
  </div>`,

  ch13: `<div class="diagram">
    <div class="diagram-title">Linear vs Binary Search</div>
    <div class="diagram-flow">
      <div class="diagram-box proc" style="max-width:240px">
        <div class="db-label">LINEAR SEARCH</div>
        <div class="db-icon">👉</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-key">Step 1</span><span class="rf-val">Check [0]</span></div>
          <div class="rf-row"><span class="rf-key">Step 2</span><span class="rf-val">Check [1]</span></div>
          <div class="rf-row"><span class="rf-key">Step 3</span><span class="rf-val">Check [2]</span></div>
          <div class="rf-row"><span class="rf-key">...</span><span class="rf-val">one by one</span></div>
        </div>
        <div class="db-tag">Works on ANY list</div>
      </div>
      <div class="diagram-vs">vs</div>
      <div class="diagram-box func" style="max-width:240px">
        <div class="db-label">BINARY SEARCH</div>
        <div class="db-icon">✂️</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-key">Step 1</span><span class="rf-val">Check middle</span></div>
          <div class="rf-row"><span class="rf-key">Step 2</span><span class="rf-val">Discard half</span></div>
          <div class="rf-row"><span class="rf-key">Step 3</span><span class="rf-val">Check new mid</span></div>
          <div class="rf-row"><span class="rf-key">...</span><span class="rf-val">halve each time</span></div>
        </div>
        <div class="db-tag">MUST be sorted first</div>
      </div>
    </div>
    <div class="av-note">1,000 items: Linear = 1,000 steps | Binary = 10 steps</div>
  </div>`,

  ch14: `<div class="diagram">
    <div class="diagram-title">Bubble Sort vs Merge Sort</div>
    <div class="diagram-flow">
      <div class="diagram-box proc" style="max-width:240px">
        <div class="db-label">BUBBLE SORT</div>
        <div class="db-icon">🫧</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-val">Compare neighbours</span></div>
          <div class="rf-row"><span class="rf-val">Swap if wrong order</span></div>
          <div class="rf-row"><span class="rf-val">Repeat until sorted</span></div>
        </div>
        <div class="db-tag">Simple but slow (N²)</div>
      </div>
      <div class="diagram-vs">vs</div>
      <div class="diagram-box func" style="max-width:240px">
        <div class="db-label">MERGE SORT</div>
        <div class="db-icon">🔀</div>
        <div class="record-fields">
          <div class="rf-row"><span class="rf-val">Split in half</span></div>
          <div class="rf-row"><span class="rf-val">Sort each half</span></div>
          <div class="rf-row"><span class="rf-val">Merge back in order</span></div>
        </div>
        <div class="db-tag">Complex but fast (N log N)</div>
      </div>
    </div>
    <div class="av-note">1,000 items: Bubble = ~1,000,000 ops | Merge = ~10,000 ops</div>
  </div>`,
};

function injectDiagrams() {
  Object.entries(DIAGRAMS).forEach(([chId, html]) => {
    const chapter = document.getElementById(chId);
    if (!chapter) return;
    // Insert after first h3 (Key Concepts) or after the analogy card
    const target = chapter.querySelector('.card.analogy') || chapter.querySelector('h3');
    if (target) {
      target.insertAdjacentHTML('afterend', html);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  2. CODE PLAYGROUND — adds "Run" button to code blocks
// ═══════════════════════════════════════════════════════════════════════

function injectPlayground() {
  document.querySelectorAll('.code-block').forEach(block => {
    const header = block.querySelector('.code-header span');
    if (!header) return;
    const label = header.textContent.toLowerCase();
    if (label.includes('pseudo')) return;

    const copyBtn = block.querySelector('.copy-btn');
    if (!copyBtn) return;
    if (block.querySelector('.run-btn')) return;

    const runBtn = document.createElement('button');
    runBtn.className = 'run-btn';
    runBtn.textContent = '▶ Run';
    runBtn.onclick = () => startInlineRun(block, runBtn);
    copyBtn.parentElement.insertBefore(runBtn, copyBtn);

    // Add interactive terminal output area
    const output = document.createElement('div');
    output.className = 'run-output';
    output.style.display = 'none';
    block.appendChild(output);
  });
}

// Track per-block stdin state for interactive input
const inlineStdin = new WeakMap();

async function startInlineRun(block, btn) {
  const output = block.querySelector('.run-output');
  inlineStdin.set(block, '');
  output.style.display = 'block';
  output.innerHTML = '';
  btn.textContent = '⏳ Running...';
  btn.disabled = true;
  await executeInlineCode(block, btn);
}

async function executeInlineCode(block, btn) {
  const code = block.querySelector('code').textContent;
  const output = block.querySelector('.run-output');
  const stdin = inlineStdin.get(block) || '';

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ code, stdin })
    });
    const data = await res.json();

    output.innerHTML = '';

    if (data.needs_input) {
      // Show output so far + inline input prompt
      const lines = (data.stdout || '').split('\n');
      const promptText = lines.pop();
      const completeOutput = lines.join('\n');
      if (completeOutput) {
        output.innerHTML += `<span class="t-output">${escapeHtml(completeOutput)}\n</span>`;
      }
      // Inline input field
      const line = document.createElement('div');
      line.className = 'inline-input-line';
      line.innerHTML = `<span class="t-prompt">${escapeHtml(promptText)}</span><input class="inline-term-input" type="text" autofocus>`;
      output.appendChild(line);
      const input = line.querySelector('input');
      input.focus();
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = input.value;
          line.innerHTML = `<span class="t-prompt">${escapeHtml(promptText)}</span><span class="t-user-input">${escapeHtml(value)}</span>`;
          inlineStdin.set(block, (inlineStdin.get(block) || '') + value + '\n');
          executeInlineCode(block, btn);
        }
      });
      output.scrollTop = output.scrollHeight;
      return;
    }

    if (data.stderr && data.returncode !== 0) {
      output.innerHTML = `<span class="ro-error">${escapeHtml(data.stderr)}</span>`;
    } else {
      let text = data.stdout || '(no output)';
      if (data.stderr) text += '\n' + data.stderr;
      output.textContent = text;
    }
  } catch(e) {
    output.innerHTML = '<span class="ro-error">Could not connect to server.</span>';
  }
  btn.textContent = '▶ Run';
  btn.disabled = false;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════
//  3. BADGES — shows earned badges in sidebar
// ═══════════════════════════════════════════════════════════════════════

async function loadBadges() {
  const student = localStorage.getItem('student-name');
  if (!student) return;

  try {
    const res = await fetch(`/api/badges/${student}`);
    const data = await res.json();
    renderBadges(data);

    // Show toast for new badges
    if (data.new && data.new.length > 0) {
      const badge = data.all_badges.find(b => b.id === data.new[0]);
      if (badge) {
        showToast(`${badge.icon} Badge unlocked: ${badge.name}!`);
      }
    }
  } catch(e) { console.warn('Failed to load badges:', e); }
}

function renderBadges(data) {
  const container = document.getElementById('badge-container');
  if (!container) return;

  const earned = new Set(data.earned || []);
  // Fix #13: escape badge name and desc
  container.innerHTML = data.all_badges.map(b => {
    const got = earned.has(b.id);
    return `<div class="badge ${got ? 'earned' : 'locked'}" title="${escapeHtml(b.desc)}">
      <span class="badge-icon">${got ? b.icon : '🔒'}</span>
      <span class="badge-name">${escapeHtml(b.name)}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
//  4. EXPLAIN-IT-BACK — adds prompt at end of each chapter
// ═══════════════════════════════════════════════════════════════════════

const EXPLAIN_PROMPTS = {
  ch1: "Explain what a function is to a 10-year-old, in 2 sentences.",
  ch2: "Why are arrays better than using lots of separate variables?",
  ch3: "Give a real-life example of something that works like a 2D array.",
  ch4: "What's the difference between an array and a record? Use an example.",
  ch5: "Why do we need files? What would happen without them?",
  ch6: "Why do games need random numbers? What would happen without them?",
  ch7: "Explain local vs global scope using the house analogy.",
  ch8: "What's the difference between validation and authentication?",
  ch9: "Explain how Python code goes from what you type to what the computer runs.",
  ch10: "What's the most important thing you learned in this course?",
  ch11: "Explain what decomposition is using a real-life example.",
  ch12: "Why is binary search more efficient than linear search? Use numbers.",
  ch13: "When would you choose linear search over binary search?",
  ch14: "Explain how bubble sort works to someone who has never coded.",
};

function injectExplainBack() {
  const student = localStorage.getItem('student-name');

  Object.entries(EXPLAIN_PROMPTS).forEach(([chId, prompt]) => {
    const chapter = document.getElementById(chId);
    if (!chapter) return;
    const completeBtn = chapter.querySelector('.chapter-complete-btn');
    if (!completeBtn) return;

    const html = `
    <div class="explain-back">
      <div class="eb-header">💬 Explain It Back</div>
      <p class="eb-prompt">${prompt}</p>
      <textarea class="eb-textarea" id="eb-${chId}" placeholder="Type your answer here..." rows="3"></textarea>
      <button class="eb-save" onclick="saveExplanation('${chId}')">Save My Answer</button>
      <div class="eb-status" id="eb-status-${chId}"></div>
    </div>`;
    completeBtn.insertAdjacentHTML('beforebegin', html);
  });

  // Load existing explanations
  if (student) loadExplanations(student);
}

async function loadExplanations(student) {
  try {
    const res = await fetch(`/api/explanations/${student}`);
    const data = await res.json();
    if (data.explanations) {
      Object.entries(data.explanations).forEach(([ch, text]) => {
        const ta = document.getElementById(`eb-${ch}`);
        if (ta) ta.value = text;
      });
    }
  } catch(e) { console.warn('Failed to load explanations:', e); }
}

async function saveExplanation(chId) {
  const student = localStorage.getItem('student-name');
  if (!student) return;
  const text = document.getElementById(`eb-${chId}`).value;
  const status = document.getElementById(`eb-status-${chId}`);
  if (!text.trim()) { status.textContent = 'Write something first!'; return; }

  try {
    await fetch(`/api/explanations/${student}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ chapter: chId, text })
    });
    status.textContent = '✓ Saved!';
    status.className = 'eb-status saved';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch(e) {
    status.textContent = 'Failed to save.';
  }
}

// Make saveExplanation available globally
window.saveExplanation = saveExplanation;

// ═══════════════════════════════════════════════════════════════════════
//  INIT — called after DOM is ready
// ═══════════════════════════════════════════════════════════════════════

function initFeatures() {
  injectDiagrams();
  injectPlayground();
  injectExplainBack();

  // Fix #14: Load badges after progress is ready (listen for login)
  const checkAndLoadBadges = () => {
    if (localStorage.getItem('student-name')) loadBadges();
  };
  setTimeout(checkAndLoadBadges, 1000);

  // Fix #6: Listen for chapter-toggled event (dispatched by app.js)
  document.addEventListener('chapter-toggled', () => {
    setTimeout(loadBadges, 300);
  });
}

// Hook into DOMContentLoaded or run immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeatures);
} else {
  initFeatures();
}
