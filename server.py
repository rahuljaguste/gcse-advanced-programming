"""
Vihaan Learns Python — Backend Server
======================================
Flask + Redis backend for tracking student progress,
badges, flashcards, and explain-it-back responses.
"""

import hmac
import os
import re
import subprocess
import time
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, Response

import redis

# ─── Load .env ───────────────────────────────────────────────────────────
def load_dotenv(path=".env"):
    """Minimal .env loader — no extra dependencies needed."""
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

_base = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_base, ".env"))

DASHBOARD_USER = os.environ.get("DASHBOARD_USER", "admin")
DASHBOARD_PASS = os.environ.get("DASHBOARD_PASS", "admin")

# ─── App setup ───────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)

# Redis: use REDIS_URL (Railway/cloud) or fall back to localhost
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
r = redis.from_url(REDIS_URL, decode_responses=True)


# ─── Dashboard auth ──────────────────────────────────────────────────────

def require_dashboard_auth(f):
    """HTTP Basic Auth decorator for teacher-only routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if (auth
                and hmac.compare_digest(auth.username, DASHBOARD_USER)
                and hmac.compare_digest(auth.password, DASHBOARD_PASS)):
            return f(*args, **kwargs)
        return Response(
            "Login required. Enter your teacher credentials.",
            401,
            {"WWW-Authenticate": 'Basic realm="Teacher Dashboard"'}
        )
    return decorated


@app.errorhandler(redis.exceptions.ConnectionError)
def handle_redis_error(e):
    return jsonify({"error": "Database unavailable. Is Redis running?"}), 503


@app.errorhandler(redis.exceptions.RedisError)
def handle_redis_generic(e):
    return jsonify({"error": "Database error. Please try again."}), 500


CHAPTERS = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8", "ch9", "ch10"]
VALID_CHAPTERS = set(CHAPTERS)
NAME_PATTERN = re.compile(r'^[a-zA-Z0-9 \-]{1,30}$')

# Fix #5: Known quiz question counts per chapter for score validation
QUIZ_TOTALS = {"ch1": 4, "ch2": 4, "ch3": 3, "ch4": 3, "ch5": 3, "ch6": 3,
               "ch7": 3, "ch8": 4, "ch9": 4}

# Valid flashcard IDs (fix #5e from review — validate card_id)
VALID_CARD_IDS = set()
for ch_num in range(1, 10):
    for card_num in range(1, 10):
        VALID_CARD_IDS.add(f"ch{ch_num}_{card_num}")

# Allowlist approach: only these imports are permitted in the playground
ALLOWED_IMPORTS = {
    "random", "math", "string", "datetime", "time",
    "tempfile", "os",  # needed for file I/O exercises (os.path, os.remove, tempfile)
}

# Dangerous builtins that must never appear
BLOCKED_BUILTINS = [
    "__import__", "exec(", "eval(", "compile(",
    "breakpoint(", "__builtins__",
]

BADGE_DEFINITIONS = [
    {"id": "first_steps",     "name": "First Steps",     "icon": "🐣", "desc": "Complete your first chapter",         "condition": {"type": "chapters_min", "count": 1}},
    {"id": "halfway",         "name": "Halfway There",   "icon": "⚡", "desc": "Complete 5 chapters",                 "condition": {"type": "chapters_min", "count": 5}},
    {"id": "array_master",    "name": "Array Master",    "icon": "📦", "desc": "Complete Ch 2 and Ch 3",              "condition": {"type": "chapters_all", "chapters": ["ch2", "ch3"]}},
    {"id": "file_wizard",     "name": "File Wizard",     "icon": "📁", "desc": "Complete Ch 5 (External Files)",      "condition": {"type": "chapters_all", "chapters": ["ch5"]}},
    {"id": "security_expert", "name": "Security Expert", "icon": "🔐", "desc": "Complete Ch 8 (Validation & Auth)",   "condition": {"type": "chapters_all", "chapters": ["ch8"]}},
    {"id": "quiz_whiz",       "name": "Quiz Whiz",       "icon": "🧠", "desc": "Score 80%+ on any 3 quizzes",         "condition": {"type": "quizzes_good", "count": 3}},
    {"id": "perfect_score",   "name": "Perfectionist",   "icon": "💯", "desc": "Get 100% on any quiz",                "condition": {"type": "quiz_perfect", "count": 1}},
    {"id": "python_pro",      "name": "Python Pro",      "icon": "🐍", "desc": "Complete ALL chapters",               "condition": {"type": "chapters_min", "count": 10}},
]

# CSRF: allowed origins
ALLOWED_ORIGINS = {"http://localhost:5000", "http://127.0.0.1:5000"}
for _port in range(5001, 5010):  # cover common dev ports
    ALLOWED_ORIGINS.add(f"http://localhost:{_port}")

# Add Railway/cloud URLs
for _env_key in ("RAILWAY_PUBLIC_DOMAIN", "RAILWAY_STATIC_URL"):
    _val = os.environ.get(_env_key, "")
    if _val:
        _val = _val.rstrip("/")
        if not _val.startswith("http"):
            ALLOWED_ORIGINS.add(f"https://{_val}")
        else:
            ALLOWED_ORIGINS.add(_val)

_custom_url = os.environ.get("APP_URL", "")
if _custom_url:
    ALLOWED_ORIGINS.add(_custom_url.rstrip("/"))

IS_CLOUD = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PUBLIC_DOMAIN"))


def sanitize_name(name):
    name = name.strip().lower()
    if not name or not NAME_PATTERN.match(name):
        return None
    return name


def get_json_body():
    """Fix #9: Safe JSON body extraction — returns {} if missing/malformed."""
    data = request.get_json(force=True, silent=True)
    if data is None:
        return {}
    return data


def parse_score(score_str):
    """Fix #10: Safe Redis score parsing — returns (got, total) or None."""
    try:
        parts = score_str.split("/")
        if len(parts) == 2:
            return int(parts[0]), int(parts[1])
    except (ValueError, TypeError):
        pass
    return None


def check_origin():
    """Reject cross-origin state-changing requests."""
    origin = request.headers.get("Origin", "")
    if not origin:
        return True  # no Origin header (non-browser clients)
    if origin in ALLOWED_ORIGINS:
        return True
    # On Railway: accept if Origin matches the request's own host
    if IS_CLOUD:
        host = request.headers.get("Host", "")
        if host and (origin == f"https://{host}" or origin == f"http://{host}"):
            return True
    return False


# ─── Static file serving (fix #11: explicit allowlist) ───────────────────

STATIC_FILES = {
    "index.html", "dashboard.html", "flashcards.html", "cheatsheet.html",
    "playground.html", "assignments.html",
    "style.css", "features.css", "app.js", "features.js",
}


@app.route("/")
def index():
    return send_from_directory(BASE_DIR,"index.html")


@app.route("/dashboard")
@require_dashboard_auth
def dashboard_page():
    return send_from_directory(BASE_DIR,"dashboard.html")


@app.route("/flashcards")
def flashcards_page():
    return send_from_directory(BASE_DIR,"flashcards.html")


@app.route("/cheatsheet")
def cheatsheet_page():
    return send_from_directory(BASE_DIR,"cheatsheet.html")

@app.route("/playground")
def playground_page():
    return send_from_directory(BASE_DIR,"playground.html")

@app.route("/assignments")
def assignments_page():
    return send_from_directory(BASE_DIR,"assignments.html")


@app.route("/<path:filename>")
def serve_static(filename):
    """Only serve explicitly allowed static files."""
    if filename in STATIC_FILES:
        return send_from_directory(BASE_DIR,filename)
    return jsonify({"error": "Not found"}), 404


# ─── Student registration ───────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register_student():
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    data = get_json_body()
    name = sanitize_name(data.get("name", ""))
    if not name:
        return jsonify({"error": "Name is required (letters, numbers, spaces, hyphens only)"}), 400
    r.sadd("students", name)
    key = f"student:{name}:registered"
    if not r.exists(key):
        r.set(key, time.strftime("%Y-%m-%d %H:%M:%S"))
    return jsonify({"status": "ok", "name": name})


@app.route("/api/students", methods=["GET"])
def list_students():
    students = sorted(r.smembers("students"))
    return jsonify({"students": students})


# ─── Chapter progress ───────────────────────────────────────────────────

@app.route("/api/progress/<student>", methods=["GET"])
def get_progress(student):
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    progress = r.hgetall(f"student:{student}")
    quizzes = r.hgetall(f"quiz:{student}")
    return jsonify({"student": student, "chapters": progress, "quizzes": quizzes})


@app.route("/api/progress/<student>", methods=["POST"])
def update_progress(student):
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    data = get_json_body()
    chapter = data.get("chapter", "")
    completed = data.get("completed", False)
    if chapter not in VALID_CHAPTERS:
        return jsonify({"error": f"Invalid chapter. Must be one of: {CHAPTERS}"}), 400
    r.sadd("students", student)
    if completed:
        r.hset(f"student:{student}", chapter, time.strftime("%Y-%m-%d %H:%M:%S"))
    else:
        r.hdel(f"student:{student}", chapter)
    return jsonify({"status": "ok", "chapter": chapter, "completed": completed})


# ─── Quiz scores ────────────────────────────────────────────────────────

@app.route("/api/quiz/<student>", methods=["POST"])
def save_quiz(student):
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    data = get_json_body()
    chapter = data.get("chapter", "")
    score = data.get("score", 0)
    total = data.get("total", 0)
    if chapter not in VALID_CHAPTERS:
        return jsonify({"error": f"Invalid chapter. Must be one of: {CHAPTERS}"}), 400

    # Fix #5: Validate score and total are integers and within range
    try:
        score = int(score)
        total = int(total)
    except (ValueError, TypeError):
        return jsonify({"error": "Score and total must be integers"}), 400

    expected_total = QUIZ_TOTALS.get(chapter)
    if expected_total is not None and total != expected_total:
        return jsonify({"error": f"Invalid total for {chapter}. Expected {expected_total}"}), 400
    if score < 0 or score > total or total <= 0:
        return jsonify({"error": "Invalid score/total range"}), 400

    # Fix #19: Only save if better than previous score
    existing = r.hget(f"quiz:{student}", chapter)
    if existing:
        parsed = parse_score(existing)
        if parsed and parsed[0] > score:
            return jsonify({"status": "ok", "chapter": chapter, "score": existing, "note": "Previous score was higher, kept it"})

    r.sadd("students", student)
    r.hset(f"quiz:{student}", chapter, f"{score}/{total}")
    return jsonify({"status": "ok", "chapter": chapter, "score": f"{score}/{total}"})


# ─── Badges ─────────────────────────────────────────────────────────────

def check_badges(student):
    """Check which badges a student has earned."""
    progress = r.hgetall(f"student:{student}")
    quizzes = r.hgetall(f"quiz:{student}")
    earned = []

    for badge in BADGE_DEFINITIONS:
        cond = badge["condition"]
        met = False

        if cond["type"] == "chapters_min":
            completed = sum(1 for ch in CHAPTERS if ch in progress)
            met = completed >= cond["count"]

        elif cond["type"] == "chapters_all":
            met = all(ch in progress for ch in cond["chapters"])

        elif cond["type"] == "quizzes_good":
            good_count = 0
            for ch, score_str in quizzes.items():
                # Fix #10: safe parsing
                parsed = parse_score(score_str)
                if parsed and parsed[1] > 0 and (parsed[0] / parsed[1]) >= 0.8:
                    good_count += 1
            met = good_count >= cond["count"]

        elif cond["type"] == "quiz_perfect":
            perfect_count = 0
            for ch, score_str in quizzes.items():
                parsed = parse_score(score_str)
                if parsed and parsed[0] == parsed[1] and parsed[1] > 0:
                    perfect_count += 1
            met = perfect_count >= cond["count"]

        if met:
            earned.append(badge["id"])

    return earned


@app.route("/api/badges/<student>", methods=["GET"])
def get_badges(student):
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    earned = check_badges(student)
    previously_earned = r.smembers(f"badges:{student}")
    new_badges = [b for b in earned if b not in previously_earned]
    for b in new_badges:
        r.sadd(f"badges:{student}", b)
    return jsonify({
        "earned": earned,
        "new": new_badges,
        "all_badges": BADGE_DEFINITIONS
    })


# ─── Flashcard mastery ──────────────────────────────────────────────────

@app.route("/api/flashcards/<student>", methods=["GET"])
def get_flashcard_mastery(student):
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    mastery = r.hgetall(f"flashcards:{student}")
    return jsonify({"student": student, "mastery": mastery})


@app.route("/api/flashcards/<student>", methods=["POST"])
def update_flashcard_mastery(student):
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    data = get_json_body()
    card_id = data.get("card_id", "")
    result = data.get("result", "")
    if not card_id or result not in ("correct", "wrong"):
        return jsonify({"error": "card_id and result (correct/wrong) required"}), 400
    # Fix #5e: Validate card_id format
    if card_id not in VALID_CARD_IDS:
        return jsonify({"error": "Invalid card_id"}), 400

    key = f"flashcards:{student}"
    current = int(r.hget(key, card_id) or 0)
    if result == "correct":
        current = min(current + 1, 5)
    else:
        current = max(current - 1, 0)
    r.hset(key, card_id, current)
    return jsonify({"status": "ok", "card_id": card_id, "mastery": current})


# ─── Explain-it-back ────────────────────────────────────────────────────

@app.route("/api/explanations/<student>", methods=["GET"])
def get_explanations(student):
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    explanations = r.hgetall(f"explanations:{student}")
    return jsonify({"student": student, "explanations": explanations})


@app.route("/api/explanations/<student>", methods=["POST"])
def save_explanation(student):
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    data = get_json_body()
    chapter = data.get("chapter", "")
    text = data.get("text", "").strip()
    if chapter not in VALID_CHAPTERS:
        return jsonify({"error": "Invalid chapter"}), 400
    if not text:
        return jsonify({"error": "Explanation text required"}), 400
    if len(text) > 1000:
        text = text[:1000]
    r.hset(f"explanations:{student}", chapter, text)
    r.hset(f"explanation_times:{student}", chapter, time.strftime("%Y-%m-%d %H:%M:%S"))
    return jsonify({"status": "ok", "chapter": chapter})


@app.route("/api/explanations", methods=["GET"])
@require_dashboard_auth
def all_explanations():
    """Teacher view."""
    students = sorted(r.smembers("students"))
    result = []
    for name in students:
        expl = r.hgetall(f"explanations:{name}")
        times = r.hgetall(f"explanation_times:{name}")
        if expl:
            result.append({"name": name, "explanations": expl, "times": times})
    return jsonify({"students": result})


# ─── Assignment submissions ──────────────────────────────────────────────

VALID_ASSIGNMENTS = {
    "ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8", "ch10",
    "proj1", "proj2", "proj3", "proj5",  # Ch10 final projects
}


@app.route("/api/assignments/<student>", methods=["GET"])
def get_assignments(student):
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    codes = r.hgetall(f"assignments:{student}")
    times = r.hgetall(f"assignment_times:{student}")
    return jsonify({"student": student, "submissions": codes, "times": times})


@app.route("/api/assignments/<student>", methods=["POST"])
def save_assignment(student):
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403
    student = sanitize_name(student)
    if not student:
        return jsonify({"error": "Invalid student name"}), 400
    data = get_json_body()
    assignment = data.get("assignment", "")
    code = data.get("code", "")
    if assignment not in VALID_ASSIGNMENTS:
        return jsonify({"error": "Invalid assignment"}), 400
    if not code.strip():
        return jsonify({"error": "No code provided"}), 400
    if len(code) > 10000:
        code = code[:10000]
    r.hset(f"assignments:{student}", assignment, code)
    r.hset(f"assignment_times:{student}", assignment, time.strftime("%Y-%m-%d %H:%M:%S"))
    return jsonify({"status": "ok", "assignment": assignment})


@app.route("/api/assignments", methods=["GET"])
@require_dashboard_auth
def all_assignments():
    """Teacher view: all submissions."""
    students = sorted(r.smembers("students"))
    result = []
    pipe = r.pipeline()
    for name in students:
        pipe.hgetall(f"assignments:{name}")
        pipe.hgetall(f"assignment_times:{name}")
    all_data = pipe.execute()
    for i, name in enumerate(students):
        codes = all_data[i * 2]
        times = all_data[i * 2 + 1]
        if codes:
            result.append({"name": name, "submissions": codes, "times": times})
    return jsonify({"students": result})


# ─── Code runner ─────────────────────────────────────────────────────────

def _check_imports(code):
    """Validate all import statements against the allowlist.
    Returns an error message string, or None if all imports are allowed."""
    # Split on both newlines and semicolons to catch "import x; import y"
    # Also normalize whitespace (tabs, multiple spaces)
    normalized = re.sub(r'[ \t]+', ' ', code)  # collapse whitespace
    statements = []
    for line in normalized.split('\n'):
        statements.extend(line.split(';'))

    for stmt in statements:
        stripped = stmt.strip()
        if not stripped:
            continue

        # Match: import X / import X as Y / import X, Y
        if re.match(r'^import\s', stripped):
            modules_part = re.sub(r'^import\s+', '', stripped).split('#')[0]
            for part in modules_part.split(','):
                # Extract module name: "random as r" → "random", strip non-alpha
                mod = re.split(r'\s', part.strip())[0].split('.')[0]
                mod = re.sub(r'[^a-zA-Z0-9_]', '', mod)  # clean punctuation
                if mod and mod not in ALLOWED_IMPORTS:
                    return (f"Import not allowed: '{mod}'\n"
                            f"Allowed modules: {', '.join(sorted(ALLOWED_IMPORTS))}\n"
                            f"This is a safe learning environment.")

        # Match: from X import Y
        if re.match(r'^from\s', stripped):
            parts = re.sub(r'^from\s+', '', stripped).split('#')[0].split()
            if parts:
                mod = parts[0].split('.')[0]
                mod = re.sub(r'[^a-zA-Z0-9_]', '', mod)
                if mod and mod not in ALLOWED_IMPORTS:
                    return (f"Import not allowed: '{mod}'\n"
                            f"Allowed modules: {', '.join(sorted(ALLOWED_IMPORTS))}\n"
                            f"This is a safe learning environment.")

    return None


@app.route("/api/run", methods=["POST"])
def run_code():
    """Execute Python code in a restricted subprocess."""
    if not check_origin():
        return jsonify({"error": "Forbidden"}), 403

    data = get_json_body()
    code = data.get("code", "")
    if not code:
        return jsonify({"error": "No code provided"}), 400
    if len(code) > 5000:
        return jsonify({"error": "Code too long (max 5000 chars)"}), 400

    # --- SECURITY: Allowlist-based import validation ---
    # Check for blocked builtins first
    for blocked in BLOCKED_BUILTINS:
        if blocked in code:
            return jsonify({
                "stdout": "",
                "stderr": f"Blocked: '{blocked.rstrip('(')}' is not allowed in the playground.\n"
                          "This is a safe learning environment.",
                "returncode": 1
            })

    # Extract all import statements and validate against allowlist
    import_error = _check_imports(code)
    if import_error:
        return jsonify({
            "stdout": "",
            "stderr": import_error,
            "returncode": 1
        })

    # Accept optional stdin for input() support
    stdin_data = data.get("stdin", "")
    if isinstance(stdin_data, str) and len(stdin_data) > 2000:
        stdin_data = stdin_data[:2000]

    # Sandbox wrapper: echo input + restrict open() + restrict os
    echo_wrapper = (
        "def _Xsetup():\n"
        "    import builtins, sys, os, tempfile\n"
        "    # Echo input\n"
        "    _orig_input = builtins.input\n"
        "    _out = sys.stdout\n"
        "    def _echo(p=''):\n"
        "        v = _orig_input(p)\n"
        "        _out.write(v + '\\n')\n"
        "        _out.flush()\n"
        "        return v\n"
        "    builtins.input = _echo\n"
        "    # Restrict open() to current working dir (sandbox temp) only\n"
        "    _orig_open = builtins.open\n"
        "    _cwd = os.getcwd()\n"
        "    _tmpdir = tempfile.gettempdir()\n"
        "    def _safe_open(f, *a, **kw):\n"
        "        p = os.path.abspath(str(f))\n"
        "        if not (p.startswith(_cwd) or p.startswith(_tmpdir)):\n"
        "            raise PermissionError(f'Cannot open files outside working/temp directory: {f}')\n"
        "        return _orig_open(f, *a, **kw)\n"
        "    builtins.open = _safe_open\n"
        "    # Restrict ALL dangerous os functions\n"
        "    _blocked_os = [\n"
        "        'system','popen','exec','execv','execve','execvp','execvpe',\n"
        "        'spawnl','spawnle','spawnlp','spawnlpe','spawnv','spawnve','spawnvp',\n"
        "        'kill','killpg','fork','forkpty',\n"
        "        'remove','unlink','rmdir','removedirs',\n"
        "        'rename','renames','replace',\n"
        "        'symlink','link','chown','chmod','lchmod',\n"
        "        'chdir','fchdir','chroot',\n"
        "        'makedirs','mkdir',\n"
        "    ]\n"
        "    for fn in _blocked_os:\n"
        "        if hasattr(os, fn):\n"
        "            setattr(os, fn, lambda *a,_n=fn,**k: (_ for _ in ()).throw(\n"
        "                PermissionError(f'os.{_n}() is not allowed in the playground')))\n"
        "    # Restrict os.listdir/scandir to cwd and tmpdir only\n"
        "    _orig_listdir = os.listdir\n"
        "    def _safe_listdir(p='.'):\n"
        "        ap = os.path.abspath(p)\n"
        "        if not (ap.startswith(_cwd) or ap.startswith(_tmpdir)):\n"
        "            raise PermissionError(f'os.listdir() not allowed outside working directory: {p}')\n"
        "        return _orig_listdir(p)\n"
        "    os.listdir = _safe_listdir\n"
        "    # Hide environment variables\n"
        "    os.environ = {}\n"
        "_Xsetup()\n"
        "del _Xsetup\n"
    )
    wrapped_code = echo_wrapper + code

    # Fix C2: Run subprocess in a per-execution temp directory
    # so file assignments (diary.txt, highscores.txt) don't write to project root
    import tempfile as _tmpmod
    run_dir = _tmpmod.mkdtemp(prefix="playground_")

    try:
        result = subprocess.run(
            ["python3", "-u", "-c", wrapped_code],
            capture_output=True, text=True, timeout=5,
            input=stdin_data if stdin_data else None,
            env={"PATH": os.environ.get("PATH", "")},
            cwd=run_dir,
        )

        # If code hit EOFError, it needs more input — return partial output
        if "EOFError" in result.stderr:
            return jsonify({
                "stdout": result.stdout[:5000],
                "stderr": "",
                "returncode": 0,
                "needs_input": True
            })
        return jsonify({
            "stdout": result.stdout[:5000],
            "stderr": result.stderr[:2000],
            "returncode": result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({"stdout": "", "stderr": "Error: Code took too long (5s limit)", "returncode": 1})
    finally:
        # Cleanup the per-execution temp directory
        import shutil
        shutil.rmtree(run_dir, ignore_errors=True)


# ─── Teacher dashboard data (fix #17: use Redis pipeline) ───────────────

@app.route("/api/dashboard", methods=["GET"])
@require_dashboard_auth
def dashboard_data():
    students = sorted(r.smembers("students"))
    result = []

    # Fix #17: batch Redis queries with pipeline
    pipe = r.pipeline()
    for name in students:
        pipe.hgetall(f"student:{name}")
        pipe.hgetall(f"quiz:{name}")
        pipe.get(f"student:{name}:registered")
        pipe.smembers(f"badges:{name}")
        pipe.hgetall(f"explanations:{name}")
    all_data = pipe.execute()

    for i, name in enumerate(students):
        base = i * 5
        progress = all_data[base]
        quizzes = all_data[base + 1]
        registered = all_data[base + 2] or "Unknown"
        badges = list(all_data[base + 3])
        explanations = all_data[base + 4]
        completed_count = sum(1 for ch in CHAPTERS if ch in progress)

        result.append({
            "name": name,
            "registered": registered,
            "completed": completed_count,
            "total": len(CHAPTERS),
            "percent": round((completed_count / len(CHAPTERS)) * 100),
            "chapters": {ch: ch in progress for ch in CHAPTERS},
            "chapter_dates": {ch: progress.get(ch, "") for ch in CHAPTERS},
            "quizzes": quizzes,
            "badges": badges,
            "explanations": explanations,
        })

    return jsonify({"students": result, "chapters": CHAPTERS, "badge_definitions": BADGE_DEFINITIONS})


# ─── Run ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Railway/cloud: bind 0.0.0.0. Local: bind 127.0.0.1
    host = "0.0.0.0" if os.environ.get("RAILWAY_ENVIRONMENT") else "127.0.0.1"

    print("\n  🐍 Vihaan Learns Python — Server")
    print("  ==================================")
    if host == "127.0.0.1":
        print(f"  Student site:      http://localhost:{port}")
        print(f"  Assignments:       http://localhost:{port}/assignments")
        print(f"  Playground:        http://localhost:{port}/playground")
        print(f"  Flashcards:        http://localhost:{port}/flashcards")
        print(f"  Cheat sheet:       http://localhost:{port}/cheatsheet")
        print(f"  Teacher dashboard: http://localhost:{port}/dashboard")
    else:
        print(f"  Running on port {port} (cloud mode)")
    print("  Press Ctrl+C to stop.\n")
    app.run(host=host, port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
