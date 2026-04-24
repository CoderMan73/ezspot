import json
import os
import sys
import tempfile
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

import mysql.connector
from docxtpl import DocxTemplate, RichText


# --- Constants & Configuration ---
SCRIPT_DIR = Path(__file__).resolve().parent
SQL_DIR = SCRIPT_DIR / "sql"
TEMPLATE_FILENAME = "Teaching Dean's List 2024-25.docx"

# SQL Files
SQL_FILE_YEAR_BOUNDS = SQL_DIR / "report_year_bounds.sql"
SQL_FILE_ELIGIBLE_TEACHERS = SQL_DIR / "deans_list_eligible.sql"

# Fonts & Styling
FONT_BOOKMAN = "Bookman Old Style"
FONT_ARIAL = "Arial"
COLOR_RED = "FF0000"

SIZE_DEAN_INFO = 12
SIZE_ACADEMIC_YEAR_FULL = 10
SIZE_TEACHER_LIST = 10
SIZE_CONTACT_INFO = 12

# Eligibility Thresholds
MIN_STUDENTS_ENROLLED = 30
MIN_DISTINCT_CRNS = 3
MIN_INSTR_RATING_MEAN = 5.2

# Placeholder Defaults
DEFAULT_PLACEHOLDER_FORMATTER = "red"


def resolve_template_path() -> Path:
    """Resolves the Dean's List template path across local and container runtime layouts."""

    candidates = [
        SCRIPT_DIR / "templates" / TEMPLATE_FILENAME,
        SCRIPT_DIR.parents[2] / TEMPLATE_FILENAME,
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    raise FileNotFoundError(
        f"Could not find Word template '{TEMPLATE_FILENAME}' in expected locations."
    )


def connection_setup():
    """Creates a new MySQL connection and cursor for document export queries."""

    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME")

    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
    )

    return conn, conn.cursor()


def normalize_name(first_name: str, last_name: str) -> str:
    """Builds a display name from first and last name values."""

    return f"{first_name.strip()} {last_name.strip()}".strip()


def load_sql_query(query_file: Path) -> str:
    """Loads a SQL query file from disk for runtime execution."""
    return query_file.read_text(encoding="utf-8").strip()


def get_report_year_bounds(cursor, report_id: int) -> tuple[int | None, int | None]:
    """Returns minimum and maximum year values for a report."""

    cursor.execute(load_sql_query(SQL_FILE_YEAR_BOUNDS), (report_id,))
    row = cursor.fetchone()
    if not row:
        return None, None

    min_year, max_year = row
    return min_year, max_year


def get_eligible_teachers(cursor, report_id: int) -> list[tuple[str, str]]:
    """Fetches instructors that satisfy Dean's List eligibility rules for a report."""

    cursor.execute(
        load_sql_query(SQL_FILE_ELIGIBLE_TEACHERS),
        (report_id, MIN_STUDENTS_ENROLLED, MIN_DISTINCT_CRNS, MIN_INSTR_RATING_MEAN),
    )
    return [(str(first_name), str(last_name)) for first_name, last_name in cursor.fetchall()]


def format_placeholder(
    placeholder_text: str,
    format_callback: Callable[[str], RichText] | None = None,
) -> RichText | str:
    """
    Formats a placeholder based on whether a value is provided.
    If no format_callback is provided, returns the placeholder as-is for replacement.
    """
    if format_callback is None:
        return placeholder_text
    return format_callback(placeholder_text)


def create_red_placeholder_formatter() -> Callable[[str], RichText]:
    """Creates a formatter that renders missing/placeholder values in red."""

    def format_red(text: str) -> RichText:
        return RichText(text, color=COLOR_RED, bold=True)

    return format_red


def create_plain_rich_text(text: str) -> RichText:
    """Wraps plain text in a RichText object for docxtpl rendering."""

    return RichText(text)


def create_styled_rich_text(
    text: str,
    *,
    font: str | None = None,
    bold: bool | None = None,
    size_pt: int | None = None,
) -> RichText:
    """Creates RichText with explicit styling.

    docxtpl RichText size values are interpreted as half-points in this runtime,
    so convert requested point sizes (e.g., 10pt -> 20).
    """

    size_half_points = size_pt * 2 if size_pt is not None else None
    return RichText(text, font=font, bold=bold, size=size_half_points)


def format_display_date(raw_date: str) -> str:
    """Formats incoming date text to 'Month DD, YYYY' when possible."""

    stripped = raw_date.strip()
    if not stripped:
        return datetime.now().strftime("%B %d, %Y")

    # Preferred input from HTML date fields is YYYY-MM-DD.
    for pattern in ("%Y-%m-%d", "%B %d, %Y", "%b %d, %Y"):
        try:
            parsed = datetime.strptime(stripped, pattern)
            return parsed.strftime("%B %d, %Y")
        except ValueError:
            continue

    # If parsing fails, preserve user-entered text.
    return stripped


def build_teacher_list_paragraph(teacher_names: list[str]) -> RichText:
    """
    Builds a RichText object containing formatted teacher list.
    Names are separated by newlines, with custom font styling.
    """
    if not teacher_names:
        return create_styled_rich_text(
            "No eligible teachers found.",
            font=FONT_BOOKMAN,
            bold=True,
            size_pt=SIZE_TEACHER_LIST,
        )

    combined_text = "\n".join(teacher_names)
    return create_styled_rich_text(
        combined_text,
        font=FONT_BOOKMAN,
        bold=True,
        size_pt=SIZE_TEACHER_LIST,
    )


def resolve_academic_years(min_year: int | None, max_year: int | None) -> tuple[str, str]:
    """Calculates short and full academic year strings based on report data."""
    if min_year is None:
        return "{{ACADEMIC_YEAR_SHORT}}", "{{ACADEMIC_YEAR_FULL}}"

    start_year = min_year
    end_year = max_year if max_year is not None else min_year
    derived_end_year = end_year if end_year > start_year else (start_year + 1)

    short_end_year = str(derived_end_year)[-2:]
    academic_year_short = f"{start_year}-{short_end_year}"
    academic_year_full = f"{start_year}-{derived_end_year}"

    return academic_year_short, academic_year_full


def get_context_field(
    user_data: dict,
    field_key: str,
    font: str,
    size_pt: int,
    placeholder_formatter: Callable[[str], RichText] | None,
    bold: bool = False,
    is_plain: bool = False,
) -> Any:
    """Helper to retrieve and style a field for the template context."""
    value = user_data.get(field_key, "").strip()

    if not value:
        return format_placeholder(f"{{{{{field_key}}}}}", placeholder_formatter)

    if is_plain:
        return create_plain_rich_text(value)

    return create_styled_rich_text(value, font=font, size_pt=size_pt, bold=bold)


def create_deans_list_docx_export(
    report_id: int,
    user_data: dict,
    placeholder_formatter_name: str = DEFAULT_PLACEHOLDER_FORMATTER,
) -> dict:
    """
    Creates a Dean's List Word export using docxptl with user-provided fields.
    """

    temp_output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    output_path = Path(temp_output_file.name)
    temp_output_file.close()

    template_path = resolve_template_path()
    placeholder_formatter = (
        create_red_placeholder_formatter()
        if placeholder_formatter_name == "red"
        else None
    )

    conn, cursor = connection_setup()
    try:
        min_year, max_year = get_report_year_bounds(cursor, report_id)
        eligible_teachers = get_eligible_teachers(cursor, report_id)
    finally:
        cursor.close()
        conn.close()

    tpl = DocxTemplate(str(template_path))

    academic_year_short, academic_year_full = resolve_academic_years(min_year, max_year)

    teacher_names = [
        normalize_name(fname, lname) for fname, lname in eligible_teachers
    ]

    # Build context with helper to minimize repetition
    context = {
        "DATE": create_styled_rich_text(
            format_display_date(user_data.get("date", "")),
            font=FONT_BOOKMAN,
            size_pt=SIZE_DEAN_INFO,
        ),
        "ACADEMIC_YEAR_SHORT": create_styled_rich_text(
            academic_year_short, font=FONT_BOOKMAN, bold=True, size_pt=SIZE_DEAN_INFO
        ),
        "ACADEMIC_YEAR_FULL": create_styled_rich_text(
            academic_year_full, font=FONT_BOOKMAN, bold=True, size_pt=SIZE_ACADEMIC_YEAR_FULL
        ),
        "ACADEMIC_YEAR": create_styled_rich_text(
            academic_year_short, font=FONT_BOOKMAN, bold=True, size_pt=SIZE_DEAN_INFO
        ),
        "TEACHER_LIST": build_teacher_list_paragraph(teacher_names),
    }

    # Standard styled fields
    styled_fields = [
        ("DEAN_FIRST_NAME", FONT_BOOKMAN, SIZE_DEAN_INFO),
        ("DEAN_LAST_NAME", FONT_BOOKMAN, SIZE_DEAN_INFO),
        ("CONTACT_FIRST_NAME", FONT_ARIAL, SIZE_CONTACT_INFO),
        ("CONTACT_LAST_NAME", FONT_ARIAL, SIZE_CONTACT_INFO),
        ("CONTACT_EMAIL", FONT_ARIAL, SIZE_CONTACT_INFO),
    ]

    for key, font, size in styled_fields:
        context[key] = get_context_field(user_data, key, font, size, placeholder_formatter)

    # Plain fields (means)
    for i in range(1000, 7000, 1000):
        key = f"mean_{i}"
        context[key] = get_context_field(
            user_data, key, "", 0, placeholder_formatter, is_plain=True
        )

    tpl.render(context)
    tpl.save(str(output_path))

    return {
        "success": True,
        "output_path": str(output_path),
        "filename": "deans-list-export.docx",
        "report_id": report_id,
    }


def parse_report_id(args: list[str]) -> int:
    """Parses the report ID argument to keep API parity with spreadsheet exports."""

    if len(args) < 2:
        raise ValueError("Missing required report ID argument.")

    try:
        report_id = int(args[1])
    except ValueError:
        raise ValueError(f"Invalid report ID: {args[1]}. Must be an integer.")

    if report_id <= 0:
        raise ValueError("Report ID must be a positive integer.")

    return report_id


def read_form_data_from_stdin() -> dict:
    """Reads Dean's List form data from stdin as JSON."""
    data = sys.stdin.read()
    if not data:
        return {}
    return json.loads(data)


if __name__ == "__main__":
    try:
        parsed_report_id = parse_report_id(sys.argv)
        form_data = read_form_data_from_stdin()

        export_result = create_deans_list_docx_export(parsed_report_id, form_data)
        print(json.dumps(export_result))
    except Exception as error:
        print(f"Word export generation failed: {error}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
