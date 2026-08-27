"""Round 2's case file (spec §22): ONE shared incident narrative for every
team, not a per-team assignment — served as a static structured payload, no
DB table needed. Flavor text / evidence only, not gated behind Round 1
completion — the WHO/WHAT/WHEN/HOW/WHY questions in question_gen.py are the
actual answer checks, and their correct answers are backed by this evidence."""

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/incident", tags=["incident"])

INCIDENT = {
    "server_log": [
        {
            "time": "2026-08-15 02:47 AM",
            "event": "Unauthorized login detected from IP 203.0.113.77",
        },
        {
            "time": "2026-08-15 02:49 AM",
            "event": "Admin credentials used to access database export tool",
        },
        {
            "time": "2026-08-15 02:53 AM",
            "event": "Large data export initiated: users_table.csv",
        },
        {
            "time": "2026-08-15 03:01 AM",
            "event": "Connection terminated; session logged out",
        },
    ],
    "suspicious_email": {
        "from": "it-support@secure-updates-portal.com",
        "subject": "Urgent: Verify Your Account Password",
        "body": (
            "Dear user, we detected unusual activity on your account. "
            "Click the link below and enter your password to verify your "
            "identity within 24 hours or your account will be suspended."
        ),
    },
    "user_activity": (
        "Employee 'admin_jsmith' received the email above at 02:10 AM and "
        "clicked the embedded link roughly 30 minutes before the "
        "unauthorized login was recorded in the server logs."
    ),
    "code_snippet": (
        "def check_login(username, password):\n"
        "    user = db.get_user(username)\n"
        "    if user.password == password:  # plaintext comparison, no hashing\n"
        "        return True\n"
        "    return False\n"
    ),
    "timeline": (
        "02:10 AM — A phishing email disguised as an IT support notice is "
        "sent to an employee. 02:40 AM — The employee clicks the link and "
        "submits their password on the fake page. 02:47 AM — The stolen "
        "credentials are used to log in; because the login endpoint compares "
        "passwords in plaintext, the attacker's captured password matches "
        "directly with no hashing to slow them down. 02:53 AM — The attacker "
        "exports the users table. 03:01 AM — The session ends."
    ),
}


@router.get("")
def get_incident(user: User = Depends(get_current_user)):
    return INCIDENT
