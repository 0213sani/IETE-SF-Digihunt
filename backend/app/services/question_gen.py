"""Deterministic per-team Round 1 question generation.

Each team gets a different instance of every category slot, but every team's
mix is the same shape (blueprint) and difficulty, seeded off the team_code so
results are reproducible.
"""

import hashlib
import random
import string
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Question, Team, TeamQuestion
from app.models.enums import TeamQuestionStatus

BLUEPRINT: list[tuple[str, int]] = [
    ("binary", 2),
    ("morse", 1),
    ("cryptography", 2),
    ("logic", 2),
    ("cybersecurity", 1),
]

ROUND2_BLUEPRINT: list[tuple[str, int]] = [
    ("who", 1),
    ("what", 1),
    ("when", 1),
    ("how", 1),
    ("why", 1),
]


def team_seed(team_code: str) -> int:
    return int(hashlib.sha256(team_code.encode()).hexdigest(), 16)


def seeded_rng(team_code: str) -> random.Random:
    return random.Random(team_seed(team_code))


def _fragment(rng: random.Random, length: int = 2) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(rng.choice(alphabet) for _ in range(length))


# ---- templated generator (proves the QuestionTemplate mechanism) ----------


def generate_binary_question(rng: random.Random) -> dict:
    bits = rng.randint(4, 8)
    value = rng.randint(2 ** (bits - 1), 2**bits - 1)
    binary_str = format(value, f"0{bits}b")

    wrong: set[int] = set()
    while len(wrong) < 3:
        delta = rng.randint(1, max(4, value // 3 + 1))
        candidate = value + rng.choice([-1, 1]) * delta
        if candidate >= 0 and candidate != value:
            wrong.add(candidate)

    options = [str(value), *[str(w) for w in wrong]]
    rng.shuffle(options)

    return {
        "question_text": f"Convert the binary number {binary_str} to decimal.",
        "options": options,
        "correct_answer": str(value),
        "code_fragment": _fragment(rng),
    }


# ---- static content banks (placeholder — real admin bank is a later group) -

def _caesar_encode(text: str, shift: int) -> str:
    out = []
    for ch in text:
        if ch.isalpha():
            base = ord("A") if ch.isupper() else ord("a")
            out.append(chr((ord(ch) - base + shift) % 26 + base))
        else:
            out.append(ch)
    return "".join(out)


MORSE_MAP = {"A": ".-", "B": "-...", "S": "...", "O": "---"}
_MORSE_VARIANTS = [
    ("A", ["N", "E", "I"]),
    ("B", ["D", "V", "M"]),
    ("S", ["H", "O", "U"]),
    ("O", ["M", "T", "W"]),
]
MORSE_BANK = [
    {
        "question_text": f"What letter does the Morse code '{MORSE_MAP[letter]}' represent?",
        "options": [letter, *wrongs],
        "correct_answer": letter,
    }
    for letter, wrongs in _MORSE_VARIANTS
]

_CRYPTO_VARIANTS = [
    ("HELLO", 1, ["WORLD", "HAPPY", "HELPS"]),
    ("GOSSIP", 2, ["MISSION", "WISDOM", "GORSIP"]),
    ("CODE", 3, ["CORD", "DOME", "COLD"]),
    ("SECURE", 1, ["SEIZURE", "SECRET", "SEVERE"]),
]
CRYPTO_BANK = [
    {
        "question_text": (
            f"Caesar cipher (shift {shift}): decode "
            f"'{_caesar_encode(plain, shift)}' back to the original word."
        ),
        "options": [plain, *wrongs],
        "correct_answer": plain,
    }
    for plain, shift, wrongs in _CRYPTO_VARIANTS
]

_LOGIC_VARIANTS = [
    (["2", "4", "6", "9"], "9"),
    (["Apple", "Banana", "Carrot", "Mango"], "Carrot"),
    (["3", "5", "7", "10"], "10"),
    (["Dog", "Cat", "Cow", "Table"], "Table"),
]
LOGIC_BANK = [
    {
        "question_text": f"Which one is the odd one out? {', '.join(seq)}",
        "options": list(seq),
        "correct_answer": answer,
    }
    for seq, answer in _LOGIC_VARIANTS
]

CYBERSECURITY_BANK = [
    {
        "question_text": "What does 'VPN' stand for?",
        "options": [
            "Virtual Private Network",
            "Virtual Public Network",
            "Verified Private Node",
            "Virtual Personal Network",
        ],
        "correct_answer": "Virtual Private Network",
    },
    {
        "question_text": "What does 'phishing' refer to?",
        "options": [
            "Tricking users into revealing sensitive info",
            "A type of firewall",
            "A network protocol",
            "A programming language",
        ],
        "correct_answer": "Tricking users into revealing sensitive info",
    },
    {
        "question_text": "What does '2FA' stand for?",
        "options": [
            "Two-Factor Authentication",
            "Two-File Access",
            "Second Factor Application",
            "Two-Firewall Architecture",
        ],
        "correct_answer": "Two-Factor Authentication",
    },
    {
        "question_text": "What is malicious software commonly called?",
        "options": ["Malware", "Firmware", "Shareware", "Freeware"],
        "correct_answer": "Malware",
    },
]


# ---- Round 2: WHO/WHAT/WHEN/HOW/WHY tied to the shared incident narrative --
# (see app/routers/incident.py — the evidence there must support these answers)

WHO_BANK = [
    {
        "question_text": "Based on the server logs, who compromised the system?",
        "options": [
            "Unknown external user",
            "The database administrator",
            "A teammate",
            "No one — false alarm",
        ],
        "correct_answer": "Unknown external user",
    },
]

WHAT_BANK = [
    {
        "question_text": "What type of attack does the suspicious email represent?",
        "options": ["Phishing", "SQL Injection", "DDoS", "Brute Force"],
        "correct_answer": "Phishing",
    },
]

WHEN_BANK = [
    {
        "question_text": "At what time did the unauthorized login occur?",
        "options": [
            "2026-08-15 02:47 AM",
            "2026-08-15 09:00 AM",
            "2026-08-14 11:30 PM",
            "2026-08-15 06:15 AM",
        ],
        "correct_answer": "2026-08-15 02:47 AM",
    },
]

HOW_BANK = [
    {
        "question_text": "How did the attacker gain access to the system?",
        "options": [
            "Exploited a plaintext password comparison in the login code",
            "Physically broke into the server room",
            "Guessed the admin's birthday",
            "Used a zero-day browser exploit",
        ],
        "correct_answer": "Exploited a plaintext password comparison in the login code",
    },
]

WHY_BANK = [
    {
        "question_text": "What was the attacker's likely motive?",
        "options": [
            "To steal sensitive user data",
            "To improve system performance",
            "To test the network for fun",
            "To fix a bug",
        ],
        "correct_answer": "To steal sensitive user data",
    },
]


def _from_bank(rng: random.Random, bank: list[dict]) -> dict:
    item = rng.choice(bank)
    options = list(item["options"])
    rng.shuffle(options)
    return {
        "question_text": item["question_text"],
        "options": options,
        "correct_answer": item["correct_answer"],
        "code_fragment": _fragment(rng),
    }


def generate_morse_question(rng: random.Random) -> dict:
    return _from_bank(rng, MORSE_BANK)


def generate_cryptography_question(rng: random.Random) -> dict:
    return _from_bank(rng, CRYPTO_BANK)


def generate_logic_question(rng: random.Random) -> dict:
    return _from_bank(rng, LOGIC_BANK)


def generate_cybersecurity_question(rng: random.Random) -> dict:
    return _from_bank(rng, CYBERSECURITY_BANK)


def generate_who_question(rng: random.Random) -> dict:
    return _from_bank(rng, WHO_BANK)


def generate_what_question(rng: random.Random) -> dict:
    return _from_bank(rng, WHAT_BANK)


def generate_when_question(rng: random.Random) -> dict:
    return _from_bank(rng, WHEN_BANK)


def generate_how_question(rng: random.Random) -> dict:
    return _from_bank(rng, HOW_BANK)


def generate_why_question(rng: random.Random) -> dict:
    return _from_bank(rng, WHY_BANK)


GENERATORS: dict[str, Callable[[random.Random], dict]] = {
    "binary": generate_binary_question,
    "morse": generate_morse_question,
    "cryptography": generate_cryptography_question,
    "logic": generate_logic_question,
    "cybersecurity": generate_cybersecurity_question,
    "who": generate_who_question,
    "what": generate_what_question,
    "when": generate_when_question,
    "how": generate_how_question,
    "why": generate_why_question,
}


def assign_round(
    db: Session, team: Team, round_number: int, blueprint: list[tuple[str, int]]
) -> list[TeamQuestion]:
    """Idempotent: returns existing TeamQuestions for this round if already
    assigned, otherwise generates the full blueprint deterministically from
    team_code. Shared by every round — round-specific behavior lives only in
    which blueprint is passed in."""
    existing = db.scalars(
        select(TeamQuestion)
        .join(Question, TeamQuestion.question_id == Question.id)
        .where(TeamQuestion.team_id == team.id, Question.round == round_number)
        .order_by(Question.id)
    ).all()
    if existing:
        return list(existing)

    rng = seeded_rng(team.team_code)
    team_questions: list[TeamQuestion] = []

    for category, count in blueprint:
        generator = GENERATORS[category]
        seen_texts: set[str] = set()
        made = 0
        attempts = 0
        while made < count:
            attempts += 1
            data = generator(rng)
            # ponytail: retry on dup pick from a small static bank; give up
            # after 50 tries and allow the repeat rather than loop forever
            if data["question_text"] in seen_texts and attempts < 50:
                continue
            seen_texts.add(data["question_text"])
            made += 1

            question = Question(
                round=round_number,
                category=category,
                difficulty="easy",
                question_type="mcq",
                question_text=data["question_text"],
                options=data["options"],
                correct_answer=data["correct_answer"],
                code_fragment=data["code_fragment"],
                active=True,
            )
            db.add(question)
            db.flush()

            tq = TeamQuestion(
                team_id=team.id,
                question_id=question.id,
                status=TeamQuestionStatus.available,
            )
            db.add(tq)
            team_questions.append(tq)

    db.commit()
    for tq in team_questions:
        db.refresh(tq)
    return sorted(team_questions, key=lambda t: t.question_id)


def assign_round1(db: Session, team: Team) -> list[TeamQuestion]:
    return assign_round(db, team, 1, BLUEPRINT)


def assign_round2(db: Session, team: Team) -> list[TeamQuestion]:
    return assign_round(db, team, 2, ROUND2_BLUEPRINT)


def compute_access_key(db: Session, team: Team) -> str | None:
    """Builds the Round 1 access key from solved TeamQuestions' code
    fragments, in the same question_id order the Round 1 board displays them
    (assign_round1 always returns that order). Returns None if Round 1 isn't
    fully solved yet. This is the one place the access-key string is built —
    both the Round 1 board (questions.py) and the Master Terminal verify
    endpoint (master.py) call it, so a team can always enter back exactly
    what it was shown.
    """
    team_questions = assign_round1(db, team)
    if not team_questions:
        return None
    fragments: list[str] = []
    for tq in team_questions:
        if tq.status != TeamQuestionStatus.solved:
            return None
        fragments.append(tq.question.code_fragment)
    return "D1G1-" + "-".join(fragments)
