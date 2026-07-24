import sys
import re

with open("app/models/settings.py", "r") as f:
    content = f.read()

if "github_token" not in content:
    content = content.replace(
        "default_mode: Mapped[str] = mapped_column(String(20), default=\"smart\")",
        "default_mode: Mapped[str] = mapped_column(String(20), default=\"smart\")\n    github_token: Mapped[str | None] = mapped_column(String(255), nullable=True)"
    )

with open("app/models/settings.py", "w") as f:
    f.write(content)
