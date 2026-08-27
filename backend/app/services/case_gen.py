"""Round 3 case assignment: deterministic 1-of-4 CaseFile pick per team.

Seeding reuses question_gen's team_seed/seeded_rng so the same team always
gets the same case (idempotent), matching the pattern used for Round 1/2
question generation.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CaseFile, Team, TeamCase
from app.services.question_gen import seeded_rng

# The four cases from the spec. case_number is the stable identity G8's
# richer seed script keys off — idempotent insert, never overwritten here.
SEED_CASES: list[dict] = [
    {
        "case_number": 1,
        "title": "Password Attack",
        "description": (
            "A mid-sized company's employee portal was breached after attackers "
            "used a credential-stuffing attack with passwords leaked from an "
            "unrelated third-party breach. Several accounts reused weak, "
            "previously-exposed passwords, and no rate limiting or MFA was in "
            "place to slow the attempt down."
        ),
        "evidence": {"leaked_passwords_reused": True, "mfa_enabled": False},
    },
    {
        "case_number": 2,
        "title": "Phishing Attack",
        "description": (
            "An employee received an email impersonating IT support and entered "
            "their credentials into a fake login page. The attacker then used "
            "those credentials to access internal systems undetected for "
            "several days before unusual activity was flagged."
        ),
        "evidence": {"delivery_vector": "email", "detected_after_days": 4},
    },
    {
        "case_number": 3,
        "title": "Data Leakage",
        "description": (
            "A misconfigured cloud storage bucket left customer records publicly "
            "accessible for weeks. A security researcher discovered the exposed "
            "data and reported it, but not before the bucket was indexed by "
            "automated scanners."
        ),
        "evidence": {"exposure_type": "public cloud bucket", "records_exposed": True},
    },
    {
        "case_number": 4,
        "title": "Encryption Incident",
        "description": (
            "A company stored user passwords using a fast, unsalted hash "
            "algorithm instead of a proper password-hashing scheme, and an "
            "internal tool transmitted sensitive fields over plain HTTP. When "
            "the database was exfiltrated, the weak hashing made recovery of "
            "original passwords trivial."
        ),
        "evidence": {"hashing_algorithm": "unsalted", "transport": "plain HTTP"},
    },
]


def seed_cases(db: Session) -> None:
    """Idempotent: inserts each case_number only if it doesn't already exist,
    so G8's richer admin seed can add content to the same rows later without
    creating duplicates."""
    for case in SEED_CASES:
        exists = db.scalar(
            select(CaseFile).where(CaseFile.case_number == case["case_number"])
        )
        if exists is None:
            db.add(CaseFile(**case, active=True))
    db.commit()


def assign_case(db: Session, team: Team) -> CaseFile:
    """Idempotent: returns the team's already-assigned case if one exists,
    otherwise deterministically picks one of the active cases (seeded off
    team_code) and records the assignment."""
    existing = db.scalar(select(TeamCase).where(TeamCase.team_id == team.id))
    if existing is not None:
        return db.get(CaseFile, existing.case_id)

    cases = db.scalars(
        select(CaseFile).where(CaseFile.active.is_(True)).order_by(CaseFile.case_number)
    ).all()
    if not cases:
        # ponytail: lazy self-seed on first use rather than wiring a startup
        # hook — seed_cases() is idempotent so this is safe under concurrency.
        seed_cases(db)
        cases = db.scalars(
            select(CaseFile).where(CaseFile.active.is_(True)).order_by(CaseFile.case_number)
        ).all()

    rng = seeded_rng(team.team_code)
    case = rng.choice(cases)

    db.add(TeamCase(team_id=team.id, case_id=case.id))
    db.commit()
    return case
