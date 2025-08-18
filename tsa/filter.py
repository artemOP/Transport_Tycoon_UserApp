import json
from datetime import datetime
from typing import Any

LAST_SEEN_CUTTOFF = datetime(2025, 3, 1)

with open("tsa.json", "r", encoding="utf-8") as f:
    data: list[dict[str, Any]] = json.load(f)

to_remove = []
for row in data:
    try:
        row["Last Seen"] = datetime.strptime(row["Last Seen"], "%d/%m/%Y, %H:%M:%S")
        row["Joined"] = datetime.strptime(row["Joined"], "%d/%m/%Y, %H:%M:%S")
    except Exception:
        continue
    if row["Last Seen"] < LAST_SEEN_CUTTOFF:
        to_remove.append(row)
    elif row["Last Seen"] == row["Joined"]:
        to_remove.append(row)

print(len(to_remove), "members to remove")
for row in to_remove:
    row["Last Seen"] = datetime.strftime(row["Last Seen"], "%d/%m/%Y, %H:%M:%S")
    row["Joined"] = datetime.strftime(row["Joined"], "%d/%m/%Y, %H:%M:%S")

with open("filtered_tsa.json", "w", encoding="utf-8") as f:
    json.dump(to_remove, f, ensure_ascii=False, indent=2)
