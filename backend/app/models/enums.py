import enum


class UserRole(str, enum.Enum):
    participant = "participant"
    admin = "admin"
    judge = "judge"


class TeamStatus(str, enum.Enum):
    active = "active"
    disqualified = "disqualified"


class TeamQuestionStatus(str, enum.Enum):
    available = "available"
    claimed = "claimed"
    solved = "solved"
