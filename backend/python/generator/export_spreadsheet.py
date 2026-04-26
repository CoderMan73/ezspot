import json
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Literal

import mysql.connector
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


ExportType = Literal["prospective", "top30"]


@dataclass(frozen=True)
class ExportConfig:
    """Static metadata for a supported export type."""

    filename: str
    sheet_name: str
    query_file: Path


SCRIPT_DIR = Path(__file__).resolve().parent
SQL_DIR = SCRIPT_DIR / "sql"

EXPORT_CONFIGS: Final[dict[ExportType, ExportConfig]] = {
    "prospective": ExportConfig(
        filename="prospective-export.xlsx",
        sheet_name="Prospective",
        query_file=SQL_DIR / "prospective.sql",
    ),
    "top30": ExportConfig(
        filename="top30-export.xlsx",
        sheet_name="Top 30",
        query_file=SQL_DIR / "top30.sql",
    ),
}

BASE_FONT = Font(name="Aptos Narrow", size=11)
TOP30_HEADER_FONT = Font(name="Aptos Narrow", size=11, bold=True, color="FFFF0000")
TOP30_HEADER_FILL = PatternFill(fill_type="solid", start_color="FFFFFF00", end_color="FFFFFF00")
PROSPECTIVE_HEADER_FONT = Font(name="Arial", size=12, bold=True, color="FFFF0000")
PROSPECTIVE_DATA_FONT = Font(name="Calibri", size=11)
PROSPECTIVE_HEADER_FILL = PatternFill(fill_type="solid", start_color="FFFFE699", end_color="FFFFE699")
CENTER_ALIGNMENT = Alignment(horizontal="center", vertical="center")
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)


def normalize_cell_value(value):
    """Normalizes worksheet values while preserving numbers for Excel operations."""

    if value is None:
        return ""

    if isinstance(value, str):
        return value.upper()

    return value


def normalize_position_type(value):
    """Normalizes known position type abbreviations to display-safe values."""

    normalized = normalize_cell_value(value)

    if normalized == "FACUL":
        return "FACULTY"

    if normalized == "ADJUN":
        return "ADJUNCT"

    return normalized


def safe_numeric(value):
    """Attempts to convert a value to an integer for Excel, falling back to string if mixed."""
    if value is None or value == "":
        return ""
    try:
        # If it's purely digits, Excel should treat it as a number
        return int(value)
    except (ValueError, TypeError):
        # Fallback to normalized uppercase string for codes like '4086H'
        return str(value).strip().upper()


def apply_base_font(worksheet, font_style=BASE_FONT):
    """Applies a base font style to all populated cells in a worksheet."""

    for row_cells in worksheet.iter_rows(
        min_row=1,
        max_row=worksheet.max_row,
        min_col=1,
        max_col=worksheet.max_column,
    ):
        for cell in row_cells:
            cell.font = font_style


def autosize_columns(worksheet):
    """Autosizes columns based on rendered string width of current cell values."""

    for column_cells in worksheet.columns:
        column_index = column_cells[0].column
        max_length = 0
        for cell in column_cells:
            cell_value = "" if cell.value is None else str(cell.value)
            if len(cell_value) > max_length:
                max_length = len(cell_value)

        worksheet.column_dimensions[get_column_letter(column_index)].width = max_length + 2


def load_sql_query(query_file: Path) -> str:
    """Loads a SQL query file from disk for runtime execution."""

    return query_file.read_text(encoding="utf-8").strip()


def populate_prospective_sheet(worksheet, rows):
    """Populates and styles the prospective worksheet from course-level rows."""

    worksheet.freeze_panes = "A2"
    worksheet.append([
        "",
        "Instuctor",
        "CLASSIFICATION",
        "Rank",
        "Subject",
        "Course Number",
        "CRN",
        "CRN Enrollment",
        "Instructor Rating Average",
    ])

    # Center all headers except Instructor (col 2) and Classification (col 3)
    for col_index in [1, 4, 5, 6, 7, 8, 9]:
        header_cell = worksheet.cell(row=1, column=col_index)
        header_cell.alignment = CENTER_ALIGNMENT

    # Apply header styling to all header cells except A1
    for col_index in range(2, 10):
        header_cell = worksheet.cell(row=1, column=col_index)
        header_cell.font = PROSPECTIVE_HEADER_FONT
        header_cell.fill = PROSPECTIVE_HEADER_FILL
        header_cell.border = THIN_BORDER

    current_key = None
    group_start_row = 2
    current_row = 2

    for row in rows:
        first_name = normalize_cell_value(row[0])
        last_name = normalize_cell_value(row[1])
        classification = normalize_position_type(row[2])
        rank = normalize_cell_value(row[3])
        crn = row[4]
        enrollment = row[5]
        rating = row[6]
        course_number = row[7]
        subject = row[8]
        row_key = (first_name, last_name)

        if current_key is None:
            current_key = row_key
            group_start_row = current_row
        elif row_key != current_key:
            worksheet.cell(row=current_row, column=8, value=f"=SUM(H{group_start_row}:H{current_row - 1})")
            worksheet.cell(row=current_row, column=9, value=f"=AVERAGE(I{group_start_row}:I{current_row - 1})")
            current_row += 1
            current_key = row_key
            group_start_row = current_row

        is_group_first_row = current_row == group_start_row
        worksheet.cell(
            row=current_row,
            column=2,
            value=f"{last_name}, {first_name}" if is_group_first_row else "",
        )
        worksheet.cell(row=current_row, column=3, value=classification if is_group_first_row else "")
        worksheet.cell(row=current_row, column=4, value=rank if is_group_first_row else "")
        worksheet.cell(row=current_row, column=5, value=subject)
        worksheet.cell(row=current_row, column=6, value=safe_numeric(course_number))
        worksheet.cell(row=current_row, column=7, value=safe_numeric(crn))
        worksheet.cell(row=current_row, column=8, value=enrollment)
        worksheet.cell(row=current_row, column=9, value=rating)
        current_row += 1

    if current_key is not None:
        worksheet.cell(row=current_row, column=8, value=f"=SUM(H{group_start_row}:H{current_row - 1})")
        worksheet.cell(row=current_row, column=9, value=f"=AVERAGE(I{group_start_row}:I{current_row - 1})")

    apply_base_font(worksheet, PROSPECTIVE_DATA_FONT)

    # Re-apply header styling to columns B-I after base font pass
    for col_index in range(2, 10):
        header_cell = worksheet.cell(row=1, column=col_index)
        header_cell.font = PROSPECTIVE_HEADER_FONT
        header_cell.fill = PROSPECTIVE_HEADER_FILL
        header_cell.border = THIN_BORDER

    for row_index in range(2, worksheet.max_row + 1):
        for column_index in (5, 6, 7, 8, 9):
            worksheet.cell(row=row_index, column=column_index).alignment = CENTER_ALIGNMENT

    for row_index in range(2, worksheet.max_row + 1):
        worksheet.cell(row=row_index, column=9).number_format = "0.00"

    # Clear all formatting from A1 (blank cell) - do this last so it's not overwritten
    a1_cell = worksheet.cell(row=1, column=1)
    a1_cell.font = Font()
    a1_cell.fill = PatternFill()
    a1_cell.border = Border()
    a1_cell.alignment = Alignment()

    subtotal_font = Font(name="Calibri", size=11, bold=False, color="FFFFFFFF")
    subtotal_fill = PatternFill(fill_type="solid", start_color="FF000000", end_color="FF000000")
    for row_index in range(2, worksheet.max_row + 1):
        enrollment_cell = worksheet.cell(row=row_index, column=8)
        rating_cell = worksheet.cell(row=row_index, column=9)

        if isinstance(enrollment_cell.value, str) and enrollment_cell.value.startswith("=SUM("):
            enrollment_cell.font = subtotal_font
            enrollment_cell.fill = subtotal_fill
            rating_cell.font = subtotal_font
            rating_cell.fill = subtotal_fill


def finalize_prospective_layout(worksheet):
    """Applies final column sizing rules specific to the prospective worksheet."""

    # Set column widths AFTER autosize_columns has run
    worksheet.column_dimensions[get_column_letter(1)].width = 8
    
    # Calculate auto width for Instructor column and add 4
    instructor_col_letter = get_column_letter(2)
    instructor_max_length = 0
    for cell in worksheet[instructor_col_letter]:
        cell_value = "" if cell.value is None else str(cell.value)
        if len(cell_value) > instructor_max_length:
            instructor_max_length = len(cell_value)
    worksheet.column_dimensions[instructor_col_letter].width = instructor_max_length + 4
    
    # Set specific column widths
    worksheet.column_dimensions[get_column_letter(3)].width = 30
    worksheet.column_dimensions[get_column_letter(4)].width = 21
    worksheet.column_dimensions[get_column_letter(5)].width = 18
    worksheet.column_dimensions[get_column_letter(6)].width = 18
    worksheet.column_dimensions[get_column_letter(7)].width = 18
    worksheet.column_dimensions[get_column_letter(8)].width = 19
    worksheet.column_dimensions[get_column_letter(9)].width = 29


def populate_top30_sheet(worksheet, rows):
    """Populates and styles the Top 30 worksheet from aggregated instructor rows."""

    worksheet.freeze_panes = "A2"
    worksheet["A1"] = ""
    worksheet["B1"] = "INSTRUCTOR"
    worksheet["C1"] = "RANK"
    worksheet["D1"] = "POSITION TYPE"
    worksheet["E1"] = "# OF COURSES TAUGHT"
    worksheet["F1"] = "# OF ENROLLMENT"
    worksheet["G1"] = "RATING AVG"

    for header_cell in worksheet[1][1:7]:
        header_cell.font = TOP30_HEADER_FONT
        header_cell.fill = TOP30_HEADER_FILL

    for index in range(1, 31):
        worksheet.cell(row=index + 1, column=1, value=index)

    for row_index, row in enumerate(rows, start=2):
        first_name = normalize_cell_value(row[0])
        last_name = normalize_cell_value(row[1])
        instr_rank = normalize_cell_value(row[2])
        position_type = normalize_position_type(row[3])
        total_students = row[4]
        total_courses = row[5]
        avg_rating = row[6]

        worksheet.cell(row=row_index, column=2, value=f"{last_name}, {first_name}".strip(", "))
        worksheet.cell(row=row_index, column=3, value=instr_rank)
        worksheet.cell(row=row_index, column=4, value=position_type)
        worksheet.cell(row=row_index, column=5, value=total_courses)
        worksheet.cell(row=row_index, column=6, value=total_students)
        worksheet.cell(row=row_index, column=7, value=avg_rating)

    apply_base_font(worksheet)

    for row_index in range(2, worksheet.max_row + 1):
        for column_index in range(1, 8):
            cell = worksheet.cell(row=row_index, column=column_index)

            if column_index in (1, 2):
                continue

            cell.alignment = CENTER_ALIGNMENT

    for row_index in range(2, worksheet.max_row + 1):
        worksheet.cell(row=row_index, column=7).number_format = "0.00"

    # Reapply header styling after base font pass so header red/yellow is preserved.
    for header_cell in worksheet[1][1:7]:
        header_cell.font = TOP30_HEADER_FONT
        header_cell.fill = TOP30_HEADER_FILL

    for header_cell in worksheet[1][0:7]:
        header_cell.border = THIN_BORDER


def finalize_top30_layout(worksheet):
    """Applies final column sizing rules specific to the Top 30 worksheet."""

    worksheet.column_dimensions["A"].width = 8


def connection_setup():
    """Creates a new MySQL connection and cursor for export execution."""

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


def save_workbook_to_temp_file(workbook: Workbook) -> str:
    """Saves a workbook to a temporary xlsx path and returns that path."""

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    temp_path = temp_file.name
    temp_file.close()
    workbook.save(temp_path)
    return temp_path


def build_prospective_workbook(report_id: int) -> dict:
    """Builds the full prospective export workbook with isolated orchestration."""

    export_config = EXPORT_CONFIGS["prospective"]
    conn, cursor = connection_setup()

    try:
        cursor.execute(load_sql_query(export_config.query_file), (report_id, report_id))
        rows = cursor.fetchall()

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = export_config.sheet_name

        populate_prospective_sheet(worksheet, rows)
        finalize_prospective_layout(worksheet)

        temp_path = save_workbook_to_temp_file(workbook)

        return {
            "success": True,
            "output_path": temp_path,
            "filename": export_config.filename,
            "rows": len(rows),
            "sheet_name": export_config.sheet_name,
        }
    finally:
        cursor.close()
        conn.close()


def build_top30_workbook(report_id: int) -> dict:
    """Builds the full Top 30 export workbook with isolated orchestration."""

    export_config = EXPORT_CONFIGS["top30"]
    conn, cursor = connection_setup()

    try:
        cursor.execute(load_sql_query(export_config.query_file), (report_id,))
        rows = cursor.fetchall()

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = export_config.sheet_name

        populate_top30_sheet(worksheet, rows)
        autosize_columns(worksheet)
        finalize_top30_layout(worksheet)

        temp_path = save_workbook_to_temp_file(workbook)

        return {
            "success": True,
            "output_path": temp_path,
            "filename": export_config.filename,
            "rows": len(rows),
            "sheet_name": export_config.sheet_name,
        }
    finally:
        cursor.close()
        conn.close()


def build_workbook(export_key: str, report_id: int):
    """Dispatches workbook generation to an export-specific orchestration path."""

    if export_key == "prospective":
        return build_prospective_workbook(report_id)

    if export_key == "top30":
        return build_top30_workbook(report_id)

    raise ValueError(f"Unsupported export type: {export_key}")


def main():
    """CLI entrypoint used by the backend service subprocess invocation."""

    if len(sys.argv) != 3:
        print("Usage: export_spreadsheet.py export_type report_id", file=sys.stderr)
        sys.exit(2)

    export_type = sys.argv[1]
    report_id = int(sys.argv[2])

    if export_type not in EXPORT_CONFIGS:
        print(f"Unsupported export type: {export_type}", file=sys.stderr)
        sys.exit(2)

    try:
        result = build_workbook(export_type, report_id)
        print(json.dumps(result))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()