import json
import os
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import mysql.connector
from docx import Document


SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATE_FILENAME = "Teaching Dean's List 2024-25.docx"


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


def remove_paragraph(paragraph):
    """Removes a paragraph from the document XML tree."""

    paragraph_element = paragraph._element
    paragraph_element.getparent().remove(paragraph_element)
    paragraph._p = paragraph._element = None


def normalize_name(first_name: str, last_name: str) -> str:
    """Builds a display name from first and last name values."""

    return f"{first_name.strip()} {last_name.strip()}".strip()


def get_report_year_bounds(cursor, report_id: int) -> tuple[int | None, int | None]:
    """Returns minimum and maximum year values for a report."""

    cursor.execute(
        """
        SELECT MIN(year), MAX(year)
        FROM spot_rows
        WHERE report_id = %s
        """,
        (report_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None, None

    min_year, max_year = row
    return min_year, max_year


def get_eligible_teachers(cursor, report_id: int) -> list[tuple[str, str]]:
    """Fetches instructors that satisfy Dean's List eligibility rules for a report."""

    cursor.execute(
        """
        SELECT
            first_name,
            last_name
        FROM spot_rows
        WHERE report_id = %s
        GROUP BY first_name, last_name
        HAVING SUM(COALESCE(students_enrolled, 0)) >= 30
           AND COUNT(DISTINCT crn) >= 3
           AND AVG(instr_rating_mean) >= 5.2
        ORDER BY last_name ASC, first_name ASC
        """,
        (report_id,),
    )
    return [(str(first_name), str(last_name)) for first_name, last_name in cursor.fetchall()]


def replace_placeholders_in_paragraph(paragraph, replacements: dict[str, str]):
    """Replaces placeholders in a paragraph while preserving paragraph-level styling."""

    original_text = paragraph.text
    updated_text = original_text

    for placeholder, value in replacements.items():
        updated_text = updated_text.replace(placeholder, value)

    if updated_text == original_text:
        return

    if paragraph.runs:
        paragraph.runs[0].text = updated_text
        for run in paragraph.runs[1:]:
            run.text = ""
        return

    paragraph.text = updated_text


def replace_placeholders_in_document(document: Document, replacements: dict[str, str]):
    """Applies placeholder replacements to body paragraphs and table cell paragraphs."""

    for paragraph in document.paragraphs:
        replace_placeholders_in_paragraph(paragraph, replacements)

    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    replace_placeholders_in_paragraph(paragraph, replacements)


def normalize_academic_year_range_sentence(
    document: Document,
    start_year: str,
    end_year: str,
):
    """Fixes the range sentence that originally used {{YYYY}}-{{YYYY}} placeholders."""

    duplicate_range = f"{start_year}-{start_year}"
    desired_range = f"{start_year}-{end_year}"

    for paragraph in document.paragraphs:
        if duplicate_range in paragraph.text:
            replace_placeholders_in_paragraph(
                paragraph,
                {duplicate_range: desired_range},
            )


def rebuild_teacher_list(document: Document, teacher_names: list[str]):
    """Replaces hardcoded teacher names in the template with runtime-generated names."""

    anchor_text = "Those teachers who taught at least 30 students"
    anchor_index = None

    for index, paragraph in enumerate(document.paragraphs):
        if paragraph.text.strip().startswith(anchor_text):
            anchor_index = index
            break

    if anchor_index is None:
        return

    # Remove all paragraphs after the anchor paragraph. The template stores static names there.
    trailing_paragraphs = list(document.paragraphs[anchor_index + 1 :])
    for paragraph in trailing_paragraphs:
        remove_paragraph(paragraph)

    if not teacher_names:
        document.add_paragraph("{{DEANS_LIST_TEACHERS}}")
        return

    for name in teacher_names:
        document.add_paragraph(name)


def create_deans_list_docx_export(report_id: int) -> dict:
    """Creates a Dean's List Word export from the project template at runtime."""

    temp_output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    output_path = Path(temp_output_file.name)
    temp_output_file.close()

    template_path = resolve_template_path()

    conn, cursor = connection_setup()
    try:
        min_year, max_year = get_report_year_bounds(cursor, report_id)
        eligible_teachers = get_eligible_teachers(cursor, report_id)
    finally:
        cursor.close()
        conn.close()

    shutil.copyfile(template_path, output_path)
    document = Document(str(output_path))

    if min_year is not None:
        start_year = min_year
        end_year = max_year if max_year is not None else min_year
    else:
        start_year = None
        end_year = None

    if start_year is not None and end_year is not None:
        derived_end_year = end_year if end_year > start_year else (start_year + 1)
        yy_value = str(derived_end_year % 100).zfill(2)
        yyyy_value = str(start_year)
        derived_end_year_value = str(derived_end_year)
    else:
        yy_value = "{{YY}}"
        yyyy_value = "{{YYYY}}"
        derived_end_year_value = "{{YYYY}}"

    teacher_names = [normalize_name(first_name, last_name) for first_name, last_name in eligible_teachers]

    replacements = {
        "{{DEAN NAME}}": "{{DEAN NAME}}",
        "{{DATE}}": datetime.now().strftime("%B %d, %Y"),
        "{{YYYY}}": yyyy_value,
        "{{YY}}": yy_value,
        "{{1000 RATING}}": "{{1000 RATING}}",
        "{{2000 RATING}}": "{{2000 RATING}}",
        "{{3000 RATING}}": "{{3000 RATING}}",
        "{{4000 RATING}}": "{{4000 RATING}}",
        "{{5000 RATING}}": "{{5000 RATING}}",
        "{{6000 RATING}}": "{{6000 RATING}}",
        "{{PROF NAME}}": "{{PROF NAME}}",
        "{{PROF EMAIL}}": "{{PROF EMAIL}}",
    }

    replace_placeholders_in_document(document, replacements)
    normalize_academic_year_range_sentence(document, yyyy_value, derived_end_year_value)
    rebuild_teacher_list(document, teacher_names)
    document.save(str(output_path))

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

    report_id = int(args[1])
    if report_id <= 0:
        raise ValueError("Report ID must be a positive integer.")

    return report_id


if __name__ == "__main__":
    try:
        parsed_report_id = parse_report_id(sys.argv)
        export_result = create_deans_list_docx_export(parsed_report_id)
        print(json.dumps(export_result))
    except Exception as error:
        print(f"Word export generation failed: {error}", file=sys.stderr)
        sys.exit(1)
