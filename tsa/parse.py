import re
import json


def extract_text(cell):
    # Remove all HTML tags, keep only text
    return re.sub("<.*?>", "", cell).strip()


def parse_html_table(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Extract header row from <thead>
    thead_match = re.search(r"<thead>.*?<tr>(.*?)</tr>.*?</thead>", html, re.DOTALL)
    if not thead_match:
        raise ValueError("No <thead> found")
    header_row = thead_match.group(1)
    headers = re.findall(r"<th[^>]*>(.*?)</th>", header_row, re.DOTALL)
    headers = [extract_text(h) for h in headers]

    # Extract all <tr> rows from <tbody>
    # There may be multiple <tbody> blocks
    tbody_blocks = re.findall(r"<tbody>(.*?)</tbody>", html, re.DOTALL)
    data = []
    for tbody in tbody_blocks:
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbody, re.DOTALL)
        for row in rows:
            cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
            cells = [extract_text(c) for c in cells]
            if len(cells) == len(headers):
                data.append(dict(zip(headers, cells)))
    return data


# Example usage:
if __name__ == "__main__":
    table_data = parse_html_table("tsa.txt")
    with open("tsa.json", "w", encoding="utf-8") as f:
        json.dump(table_data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(table_data)} rows to tsa.json")
