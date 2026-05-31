# GCSE Advanced Programming

A locally-hosted learning platform for **GCSE Computer Science — Topic 3: Advanced Programming**, built with Flask, Redis, and vanilla JS.

## Features

| Feature | Description |
|---------|-------------|
| **10 Chapters** | Subroutines, Arrays, 2D Arrays, Records, Files, Random, Scope, Validation & Auth, Programming Languages, Final Project |
| **Visual Diagrams** | CSS-based diagrams for every chapter — arrays as boxes, scope as a house, compiler vs interpreter flow |
| **Interactive Playground** | Write Python, hit Run. Terminal-style `input()` support — prompts appear inline, type your answer, code continues |
| **13 Assignments** | 9 chapter assignments + 4 final projects (Gaming Opponents, Scored Opponents, Gaming Teams, Slot Machine, Freestyle) with embedded code editors, Run/Save/Submit |
| **Flashcards** | Flip-card revision for every chapter. Mastery tracking (5 levels) — cards you get wrong come first |
| **Quizzes** | Interactive multiple-choice per chapter with instant feedback. Best score kept |
| **Cheat Sheet** | Printable single-page reference — all syntax, concepts, pseudocode |
| **Achievement Badges** | 8 badges: First Steps, Halfway There, Array Master, File Wizard, Security Expert, Quiz Whiz, Perfectionist, GCSE Advanced Programming |
| **Explain-It-Back** | Writing prompts at end of each chapter — "Explain X to a 10-year-old" |
| **Teacher Dashboard** | Password-protected. View all student progress, quiz scores, badge unlocks, assignment submissions, explanations |
| **Auto-Save** | Assignments auto-save every 60s + warn before leaving with unsaved changes |
| **Code Sandbox** | Import allowlist (random, math, string, datetime, time, tempfile, os). Dangerous `os` functions blocked. Each run isolated in temp directory |

## Quick Start

### Prerequisites
- Python 3.8+
- Redis

### Setup

```bash
# Clone
git clone https://github.com/rahuljaguste/gcse-advanced-programming.git
cd gcse-advanced-programming

# Set teacher dashboard credentials
cp .env.example .env
# Edit .env with your username and password

# Start Redis (if not running)
brew services start redis   # macOS
# or: redis-server &

# Run
./start.sh
```

The script auto-installs Flask and Redis Python packages if missing.

### URLs

| Page | URL |
|------|-----|
| Student site | http://localhost:5000 |
| Assignments | http://localhost:5000/assignments |
| Playground | http://localhost:5000/playground |
| Flashcards | http://localhost:5000/flashcards |
| Cheat Sheet | http://localhost:5000/cheatsheet |
| Teacher Dashboard | http://localhost:5000/dashboard |

## Architecture

```
Browser ──→ Flask (server.py) ──→ Redis
              │
              ├── Static pages (index.html, assignments.html, etc.)
              ├── API endpoints (/api/progress, /api/quiz, /api/run, etc.)
              └── Code runner (subprocess with sandbox)
```

### Tech Stack
- **Backend:** Flask, Redis (via redis-py)
- **Frontend:** Vanilla JS, CSS (no frameworks)
- **Code Runner:** Python subprocess with import allowlist, restricted `os`, `open()` sandboxing, per-run temp directory isolation
- **Auth:** HTTP Basic Auth for teacher dashboard, credentials in `.env`
- **Syntax Highlighting:** Prism.js (CDN)
- **Fonts:** Inter + JetBrains Mono (Google Fonts CDN)

### File Structure

```
├── server.py              # Flask backend + Redis + code runner
├── .env.example           # Teacher credentials template
├── start.sh               # One-click launcher
├── requirements.txt       # Python dependencies
│
├── index.html             # Main learning site (10 chapters)
├── assignments.html       # 13 assignments with embedded editors
├── playground.html        # Interactive Python playground
├── flashcards.html        # Flashcard revision system
├── cheatsheet.html        # Printable cheat sheet
├── dashboard.html         # Teacher dashboard (auth-protected)
│
├── app.js                 # Core frontend (login, progress, quizzes)
├── features.js            # Diagrams, playground, badges, explain-it-back
├── style.css              # Main styles
├── features.css            # Diagram + feature styles
│
└── assignments/
    ├── ch1_pocket_money.py       # Ch1: Procedures & Functions
    ├── ch2_playlist_manager.py   # Ch2: 1D Arrays
    ├── ch3_tic_tac_toe.py        # Ch3: 2D Arrays
    ├── ch4_pokemon_cards.py      # Ch4: Records
    ├── ch5_digital_diary.py      # Ch5: File Handling
    ├── ch6_race_to_50.py         # Ch6: Random Numbers
    ├── ch7_adventure_game.py     # Ch7: Scope & Structure
    ├── ch8_secure_login.py       # Ch8: Validation & Auth
    ├── ch10_slot_machine.py      # Ch10: Final Project (Slot Machine)
    ├── proj1_gaming_opponents.py # Final: Gaming Opponents (Easy)
    ├── proj2_scored_opponents.py # Final: Scored Opponents (Medium)
    ├── proj3_gaming_teams.py     # Final: Gaming Teams (Medium-Hard)
    ├── proj5_freestyle.py        # Final: Freestyle Project
    └── data/
        ├── gamerNames.txt        # 20 gamer names
        └── gamerNamesScores.txt  # 20 gamer names with scores
```

## Redis Data Model

| Key Pattern | Type | Stores |
|-------------|------|--------|
| `students` | Set | All student names |
| `student:{name}` | Hash | Chapter → completion timestamp |
| `quiz:{name}` | Hash | Chapter → "score/total" |
| `badges:{name}` | Set | Earned badge IDs |
| `flashcards:{name}` | Hash | Card ID → mastery level (0-5) |
| `explanations:{name}` | Hash | Chapter → explanation text |
| `assignments:{name}` | Hash | Assignment ID → code |

## Security

- Server binds to `127.0.0.1` only (localhost)
- Import allowlist: only `random`, `math`, `string`, `datetime`, `time`, `tempfile`, `os` permitted
- Dangerous `os` functions blocked: `system`, `popen`, `remove`, `rename`, `chdir`, `mkdir`, `symlink`, etc.
- `open()` restricted to working/temp directories
- `os.listdir()` restricted to working/temp directories
- `os.environ` hidden (empty dict)
- Each code execution runs in an isolated temp directory (cleaned up after)
- `__import__`, `exec()`, `eval()`, `__builtins__` blocked
- CSRF protection via Origin header checking
- Static file serving via explicit allowlist (server.py not accessible)
- Teacher dashboard requires HTTP Basic Auth
- `.env` excluded from git via `.gitignore`
- Student names sanitized (alphanumeric + spaces/hyphens, max 30 chars)
- Quiz scores validated against expected totals, best score preserved

## Static GitHub Pages Build

A backend-free version of this site (no Flask, no Redis) can be deployed to
GitHub Pages. It stores progress in the browser (localStorage) and runs Python
in-browser via Pyodide (WebAssembly).

### Build

```bash
./build-static.sh        # generates ./docs
bash tests/run-all.sh    # run the unit + build tests
```

### Deploy

1. Commit the generated `docs/` folder.
2. GitHub repo → Settings → Pages → Source: **Deploy from a branch** →
   `main` / `/docs`.
3. Site goes live at `https://<user>.github.io/<repo>/`.

### Differences from the Flask version

- Progress, quizzes, flashcards, badges, and explanations are **per-browser**
  (localStorage) — no central store, no cross-device sync.
- The **teacher dashboard is not included** (it needs a central server).
- The **Run** button uses Pyodide; first run downloads ~6–10 MB (cached after).
- **Sandboxing:** the Flask runner enforced an import allowlist and blocked
  dangerous `os`/`open` calls. Pyodide needs none of that — it is a per-tab
  WebAssembly sandbox with no real filesystem, OS, network, or `subprocess`
  access — so code runs unrestricted within that sandbox.
- **Infinite-loop caveat:** Python runs on the page's main thread. The 5-second
  timeout relies on `SharedArrayBuffer`, which browsers only expose in a
  cross-origin-isolated context (COOP/COEP headers). GitHub Pages does not send
  those headers, so a genuine infinite compute loop (e.g. `while True: pass`)
  will freeze the tab until it is reloaded. Programs that finish, raise an error,
  or wait for `input()` are unaffected. (A future Web-Worker port would remove
  this limitation; the Flask version ran code server-side and was not affected.)

The Flask + Redis app (`server.py`, `start.sh`, Railway config) is unchanged and
still works for full multi-student tracking.

## License

Built for personal educational use.
