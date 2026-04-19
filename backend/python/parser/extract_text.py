import fitz
import sys
import json
import os
import mysql.connector


# margin that defines the footer beginning
BOTTOM_MARGIN = 75.0
# acceptable tolerance between rows
ROW_TOL = 4.5
# accetpable tolerance for groups
GROUP_Y_TOL = 2.5

# sets up the db connection
def connection_setup():
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME")

    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )

    return conn, conn.cursor()


# builds report metadata
def build_report_data(filename: str, user_pid: str) -> dict:
    return {
        "filename": filename,
        "processing_status": "Processing",
        "user_pid": user_pid
    }


# builds instructor stats
def compute_stat_rows(lst: list) -> list:
    prof_stats = {}

    for row in lst:
        key = (row["first_name"].strip(), row["last_name"].strip())

        if key not in prof_stats:
            prof_stats[key] = {
                "first_name": row["first_name"].strip(),
                "last_name": row["last_name"].strip(),
                "year": row["year"],
                "sum": 0.0,
                "count": 0
            }

        if row["instr_rating_mean"] is not None:
            prof_stats[key]["sum"] += row["instr_rating_mean"]
            prof_stats[key]["count"] += 1

    stats = []
    for prof in prof_stats.values():
        if prof["count"] > 0:
            stats.append({
                "first_name": prof["first_name"],
                "last_name": prof["last_name"],
                "year": prof["year"],
                "rating": round(prof["sum"] / prof["count"], 2)
            })

    return stats


# runs the parse/stat steps
def process_report(pdf_path: str, report_data: dict) -> tuple[list, list]:
    rows = parse_pdf(pdf_path)
    stat_rows = compute_stat_rows(rows)
    return rows, stat_rows


# inserts spot rows
def insert_spot_rows(spot_rows: list, report_id: int, cursor) -> bool:
    if spot_rows is None:
        return 1

    query = """
    INSERT INTO spot_rows
    (report_id, first_name, last_name, instr_classification, instr_rank, subject, course_number, crn, students_enrolled, instr_rating_mean, year)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values_list = []
    for row in spot_rows:
        values_list.append((
            report_id,
            row["first_name"],
            row["last_name"],
            row["instr_classification"],
            row["instr_rank"],
            row["subject"],
            row["course_number"],
            row["crn"],
            row["students_enrolled"],
            row["instr_rating_mean"],
            row["year"]
        ))

    cursor.executemany(query, values_list)
    return 0


# inserts stat rows
def insert_stat_rows(stat_rows: list, report_id: int, cursor) -> bool:
    if stat_rows is None:
        return 1

    query = """
    INSERT INTO statistics
    (report_id, year, rating, instr_first_name, instr_last_name)
    VALUES (%s, %s, %s, %s, %s)
    """

    values_list = []
    for row in stat_rows:
        values_list.append((
            report_id,
            row["year"],
            row["rating"],
            row["first_name"],
            row["last_name"]
        ))

    cursor.executemany(query, values_list)
    return 0


# updates report status
def update_report_status(report_id: int, status: str, curr):
    query = """
    UPDATE report_upload SET processing_status = %s WHERE report_id = %s;
    """
    curr.execute(query, [status, report_id])


# groups page words into lines
def get_lines(page, words=None):
    if words is None:
        words = page.get_text("words")

    lines = {}
    # store the words in line obj for that contains all words on a given line
    for w in words:
        x0, y0, x1, y1, text, *_ = w
        key = round(y0, 1)
        lines.setdefault(key, []).append(w)

    result = []
    # put the words back together that are on the same line
    for _, line_words in sorted(lines.items(), key=lambda x: x[0]):
        line_words.sort(key=lambda w: w[0])
        text = " ".join(w[4] for w in line_words)
        result.append((text, line_words))

    return result


# finds section header rows
def find_section_headers(page, words=None):
    # get all the lines of the pdf
    lines = get_lines(page, words)
    raw_headers = []

    # for every header line that is detected, build a box around the header and append
    for text, words_in_line in lines:
        low = text.lower()
        if "instructor" in low and "mean" in low:
            x0 = min(w[0] for w in words_in_line)
            y0 = min(w[1] for w in words_in_line)
            x1 = max(w[2] for w in words_in_line)
            y1 = max(w[3] for w in words_in_line)
            raw_headers.append(fitz.Rect(x0, y0, x1, y1))

    raw_headers.sort(key=lambda r: r.y0)

    merged = []
    min_header_gap = 20.0

    # loop over the headers and check if accidentally copied a header
    # just merge them if we did 
    for h in raw_headers:
        if not merged:
            merged.append(h)
            continue

        prev = merged[-1]

        if h.y0 - prev.y0 < min_header_gap:
            merged[-1] = fitz.Rect(
                min(prev.x0, h.x0),
                min(prev.y0, h.y0),
                max(prev.x1, h.x1),
                max(prev.y1, h.y1),
            )
        else:
            merged.append(h)

    return merged


# gets the name box
def get_name_box(section_rect):
    return fitz.Rect(section_rect.x0, section_rect.y0 + 10, section_rect.x0 + 84, section_rect.y0 + 30)


def get_classification_box(section_rect):
    return fitz.Rect(section_rect.x0 + 87, section_rect.y0 + 10, section_rect.x0 + 120, section_rect.y0 + 30)


# gets the rank box
def get_rank_box(section_rect):
    return fitz.Rect(section_rect.x0 + 135, section_rect.y0 + 10, section_rect.x0 + 170, section_rect.y0 + 30)


# gets the enrollment box
def get_enrollment_box(section_rect):
    return fitz.Rect(section_rect.x0 + 655, section_rect.y0 + 10, section_rect.x0 + 675, section_rect.y1 - 15)

# gets the term box
def get_term_box(section_rect):
    return fitz.Rect(section_rect.x0 + 300, section_rect.y0 + 10, section_rect.x0 + 350, section_rect.y1 - 10)


# gets the subject box
def get_subject_box(section_rect):
    return fitz.Rect(section_rect.x0 + 435, section_rect.y0 + 10, section_rect.x0 + 460, section_rect.y1 - 10)


# gets the course number box
def get_course_number_box(section_rect):
    return fitz.Rect(section_rect.x0 + 465, section_rect.y0 + 10, section_rect.x0 + 490, section_rect.y1 - 10)


# gets the crn box
def get_crn_box(section_rect):
    return fitz.Rect(section_rect.x0 + 595, section_rect.y0 + 10, section_rect.x0 + 620, section_rect.y1 - 10)

# gets the mean box
def get_mean_box(section_rect):
    return fitz.Rect(section_rect.x0 + 725, section_rect.y0 + 10, section_rect.x0 + 750, section_rect.y1 - 15)


# gets the latest matching text above a row
def closest_prior_text(entries, target_top, tolerance=120.0):
    best = None

    # loop for looping over entries and chose the best match if it is above the current CRN
    for entry in entries:
        if entry["top"] <= target_top + 0.5:
            if best is None or entry["top"] > best["top"]:
                best = entry

    if best is None:
        return None
    
    # make sure we dont match with something that is outside the threshold
    if target_top - best["top"] <= tolerance:
        return best["text"]

    return None


# gets words that overlap a box
def words_in_box(page, box, words=None):
    # get words from whole page if none fgiven
    if words is None:
        words = page.get_text("words")

    result = []\
        
    for w in words:
        x0, y0, x1, y1, text, *_ = w

        ix0 = max(x0, box.x0)
        iy0 = max(y0, box.y0)
        ix1 = min(x1, box.x1)
        iy1 = min(y1, box.y1)

        # if no overlap, do not append
        if ix1 <= ix0 or iy1 <= iy0:
            continue

        # else append
        result.append(w)

    result.sort(key=lambda w: (round(w[1], 1), w[0]))
    return result


# checks if text looks like a crn
def looks_like_crn(s):
    return s.isdigit() and len(s) == 5


# checks if text looks like a term
def looks_like_term(s):
    return s.isdigit() and len(s) == 6


# cleans int values
def clean_int(value):
    if value is None:
        return None
    value = str(value).strip().replace(",", "")
    return int(value) if value.isdigit() else None


# cleans float values
def clean_float(value):
    if value is None:
        return None
    value = str(value).strip().replace(",", "")
    try:
        return float(value)
    except Exception:
        return None


# extracts grouped entries from a column
def extract_column_entries(page, box, value_filter=None, y_tol=GROUP_Y_TOL, words=None):
    # get the words in the given box
    box_words = words_in_box(page, box, words)
    if not box_words:
        return []

    word_groups = []
    current_group = [box_words[0]]

    # loop over every word, compare to last and if it is small enough it is the same row group
    # if not, it starts a new row 
    for word in box_words[1:]:
        if abs(word[1] - current_group[-1][1]) <= y_tol:
            current_group.append(word)
        else:
            word_groups.append(current_group)
            current_group = [word]
    word_groups.append(current_group)

    extracted_entries = []
    # for each suspected row, sort it to reading order 
    for group in word_groups:
        group.sort(key=lambda word: word[0])
        # extract only the word and now spaces or blanks
        group_texts = [word[4].strip() for word in group if word[4].strip()]
        if not group_texts:
            continue

        # combine the row into a single txt value
        combined_text = " ".join(group_texts).strip()
        group_top = min(word[1] for word in group)

        # if no filter was given, just appnd
        if value_filter is None:
            extracted_entries.append({
                "text": combined_text,
                "top": group_top
            })
            continue

        # if a filter is given, only append accordingly 
        if value_filter(combined_text):
            extracted_entries.append({
                "text": combined_text,
                "top": group_top
            })
            continue

        # handle the case where the whole line does not pass
        # but potentially a bunch of words in there do 
        for word in group:
            single_word_text = word[4].strip()
            if single_word_text and value_filter(single_word_text):
                extracted_entries.append({
                    "text": single_word_text,
                    "top": word[1]
                })

    return extracted_entries


# gets the nearest row value
def closest_any_text(entries, target_top, tolerance=ROW_TOL):
    best_text = None
    best_delta = None

    # loop over every entry compute the acceptable difference and update trackers
    for entry in entries:
        delta = abs(entry["top"] - target_top)
        if best_delta is None or delta < best_delta:
            best_delta = delta
            best_text = entry["text"]

    if best_delta is not None and best_delta <= tolerance:
        return best_text
    return None


# splits a name into first and last
def parse_name(name_string):
    if not name_string or "," not in name_string:
        return None, None

    last, first = name_string.split(",", 1)
    first = first.strip()
    last = last.strip()

    if not first or not last:
        return None, None

    return first, last


# gets header text from the first pages
def get_header_info(doc):
    text = ""
    for page in doc[:3]:
        text += (page.get_text("text") or "").lower()
    return text


# checks that the pdf is the right report
def ensure_spot_report(headers):
    required = ["spot", "instructor overview", "sections taught"]
    for r in required:
        if r not in headers:
            raise ValueError("Not a SPOT report")


# makes a full height column box
def make_full_height_box(page, x0, x1):
    return fitz.Rect(x0, 0, x1, page.rect.height - BOTTOM_MARGIN)


# builds one context from a section
def build_context_from_rect(page, page_words, section_rect, inherited=None):
    # get the instr name and split it 
    name_words = extract_column_entries(page, get_name_box(section_rect), words=page_words)
    name_string = " ".join(w["text"] for w in name_words)

    first, last = parse_name(name_string)
    if (first is None or last is None) and inherited is not None:
        first = inherited.get("first")
        last = inherited.get("last")

    if first is None or last is None:
        return None

    # get the classification and rank
    classi_words = extract_column_entries(page, get_classification_box(section_rect), words=page_words)
    rank_words = extract_column_entries(page, get_rank_box(section_rect), words=page_words)

    classification = classi_words[0]["text"] if classi_words else None
    rank = rank_words[0]["text"] if rank_words else None

    if classification is None and inherited is not None:
        classification = inherited.get("classification")

    if rank is None and inherited is not None:
        rank = inherited.get("rank")

    # get the year and handle if ther is multiple
    year_words = extract_column_entries(page, get_term_box(section_rect), looks_like_term, words=page_words)

    terms = []
    for w in year_words:
        txt = w["text"].strip()
        # convert to actual year
        if txt.isdigit() and len(txt) == 6:
            terms.append({
                "year": int(txt[:4]),
                "top": w["top"]
            })

    terms.sort(key=lambda x: x["top"])

    current_year = None
    # handle edge case where a row continues to the next page
    if inherited is not None:
        current_year = inherited.get("current_year")

    # return alll the data from this given section context (the section pertaining to a single professor in the reprt)
    return {
        "top": section_rect.y0,
        "bottom": section_rect.y1,
        "first": first,
        "last": last,
        "classification": classification,
        "rank": rank,
        "terms": terms,
        "current_year": current_year,
    }


# builds page contexts from headers
def build_page_contexts(page, page_words, prev_ctx):
    # find the header and footer of the page
    headers = find_section_headers(page, page_words)
    page_bottom = page.rect.height - BOTTOM_MARGIN
    contexts = []

    # handle case where overlaps on another page 
    if prev_ctx is not None:
        # determine where the continuation ends
        cont_bottom = headers[0].y0 if headers else page_bottom
        # build the context region and add it to the list
        if cont_bottom > 5:
            cont_rect = fitz.Rect(0, 0, page.rect.width, cont_bottom)
            ctx = build_context_from_rect(page, page_words, cont_rect, inherited=prev_ctx)
            if ctx is not None:
                contexts.append(ctx)

    # loop over the contexts using the header values and create a rect and append
    for i, header in enumerate(headers):
        top = header.y0
        bottom = headers[i + 1].y0 if i + 1 < len(headers) else page_bottom
        rect = fitz.Rect(0, top, page.rect.width, bottom)
        ctx = build_context_from_rect(page, page_words, rect, inherited=None)
        if ctx is not None:
            contexts.append(ctx)

    return contexts


# finds the matching context for a row
def find_context_for_top(contexts, top):
    for ctx in contexts:
        if ctx["top"] <= top < ctx["bottom"]:
            return ctx

    if contexts and top >= contexts[-1]["top"]:
        return contexts[-1]

    return None


# assigns the right year to a row
# handles the edge case of multiple terms 
def assign_year_for_top(ctx, top):
    terms = sorted(ctx.get("terms", []), key=lambda t: t["top"])

    best_year = None
    best_top = None

    for term in terms:
        term_top = term["top"]

        if term_top <= top:
            if best_top is None or term_top > best_top:
                best_top = term_top
                best_year = term["year"]

    if best_year is None:
        best_year = ctx.get("current_year")

    if best_year is not None:
        ctx["current_year"] = best_year

    return best_year
    return year


# parses the pdf into row data
def parse_pdf(pdf_path: str) -> list:
    # open the doc and get the header info and make sure it is a spot report 
    doc = fitz.open(pdf_path)
    try:
        header_info = get_header_info(doc)
        ensure_spot_report(header_info)
        rows = []
        prev_ctx = None

        # get every word in the pdf and sort them into reading order
        for j, page in enumerate(doc):
            page_words = page.get_text("words")
            page_words.sort(key=lambda w: (round(w[1], 1), w[0]))

            # find all contexts of the pages
            contexts = build_page_contexts(page, page_words, prev_ctx)

            # extract all the necessary data using column extraction
            crn_entries = extract_column_entries(
                page,
                make_full_height_box(page, 595, 620),
                looks_like_crn,
                words=page_words,
            )

            enroll_entries = extract_column_entries(
                page,
                make_full_height_box(page, 655, 675),
                lambda s: s.replace(",", "").isdigit(),
                words=page_words,
            )

            mean_entries = extract_column_entries(
                page,
                make_full_height_box(page, 725, 750),
                lambda s: clean_float(s) is not None,
                words=page_words,
            )

            subject_entries = extract_column_entries(
                page,
                make_full_height_box(page, 435, 460),
                lambda s: s.strip().isalpha() and 2 <= len(s.strip()) <= 5,
                words=page_words,
            )

            course_entries = extract_column_entries(
                page,
                make_full_height_box(page, 465, 490),
                lambda s: 3 <= len(s.strip()) <= 5 and s.strip()[0].isdigit() and s.strip().isalnum(),
                words=page_words,
            )

            # loop over all CRNS and find their context 
            for crn_entry in crn_entries:
                top = crn_entry["top"]
                ctx = find_context_for_top(contexts, top)
                if ctx is None:
                    continue
                # find the values associate with this CRN
                enroll = closest_any_text(enroll_entries, top, tolerance=ROW_TOL)
                mean = closest_any_text(mean_entries, top, tolerance=ROW_TOL)
                subject = closest_prior_text(subject_entries, top, tolerance=120.0)
                course_number = closest_prior_text(course_entries, top, tolerance=120.0)
                row_year = assign_year_for_top(ctx, top)

                # build a db row entry using the context and crn 
                row = row_builder(
                    ctx["first"],
                    ctx["last"],
                    ctx["classification"],
                    ctx["rank"],
                    subject,
                    course_number,
                    crn_entry["text"],
                    enroll,
                    mean,
                    row_year
                )
                rows.append(row)

            # save the last context in case we have continuation on next page
            if contexts:
                last_ctx = contexts[-1]
                fallback_year = last_ctx["terms"][-1]["year"] if last_ctx["terms"] else None
                prev_ctx = {
                    "first": last_ctx["first"],
                    "last": last_ctx["last"],
                    "classification": last_ctx["classification"],
                    "rank": last_ctx["rank"],
                    "current_year": last_ctx["current_year"] if last_ctx["current_year"] is not None else fallback_year,
                }

            print(f"Page {j+1} Finished", file=sys.stderr)

        return rows
    finally:
        doc.close()


# builds one db row
def row_builder(fname, lname, cl, rank, subject, course_number, crn, enrollment, average, year):
    if average in (None, ""):
        new_avg = None
    else:
        new_avg = float(average)

    if enrollment in (None, ""):
        new_enroll = None
    else:
        new_enroll = int(enrollment)

    return {
        "first_name": fname,
        "last_name": lname,
        "instr_classification": cl,
        "instr_rank": rank,
        "subject": subject,
        "course_number": course_number,
        "crn": int(crn),
        "students_enrolled": new_enroll,
        "instr_rating_mean": new_avg,
        "year": year,
    }

# builds simple section rectangles
def build_sections(page, words=None):
    headers = find_section_headers(page, words)
    sections = []

    for i in range(len(headers)):
        top = headers[i].y0
        if i + 1 < len(headers):
            bottom = headers[i + 1].y0
        else:
            bottom = page.rect.height - BOTTOM_MARGIN

        rect = fitz.Rect(0, top, page.rect.width, bottom)
        sections.append(rect)

    return sections


# runs the production entry point
def main():
    if len(sys.argv) != 5:
        print("Usage: script pdf_path user_pid filename report_id", file=sys.stderr)
        sys.exit(2)

    conn, curr = connection_setup()

    pdf_path = sys.argv[1]
    user_pid = sys.argv[2]
    filename = sys.argv[3]
    report_id = int(sys.argv[4])

    try:
        report_data = build_report_data(filename, user_pid)
        rows, stat_rows = process_report(pdf_path, report_data)

        exit_code = insert_spot_rows(rows, report_id, curr)
        exit_code_stat = insert_stat_rows(stat_rows, report_id, curr)

        if exit_code == 0 and exit_code_stat == 0:
            update_report_status(report_id, "Processed", curr)
        else:
            update_report_status(report_id, "Failed", curr)

        conn.commit()

        result = {
            "success": True,
            "report_id": report_id,
            "rows_parsed": len(rows),
            "stats_built": len(stat_rows),
            "spot_exit_code": exit_code,
            "stat_exit_code": exit_code_stat
        }
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        try:
            conn.rollback()
            update_report_status(report_id, "Failed", curr)
            conn.commit()
        except Exception as update_error:
            print(f"Failed to update report status: {update_error}", file=sys.stderr)

        print(f"Parser/Database error: {e}", file=sys.stderr)
        sys.exit(1)

    finally:
        curr.close()
        conn.close()


if __name__ == "__main__":
    main()
    print("working")