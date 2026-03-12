import pdfplumber as pp
import sys
import json


def build_report_data(filename: str, semester: str, year: int, user_pid: str) -> dict:
    return {
        "filename": filename,
        "semester": semester,
        "year": year,
        "processing_status": "Processed",
        "user_pid": user_pid
    }

def parse_pdf(pdf_path: str) -> list:
    with pp.open(pdf_path) as pdf:
        header_info = get_header_info(pdf)
        ensure_spot_report(header_info)
        rows = []


        for j, page in enumerate(pdf.pages):
            # find the tables in the pdf
            tables = page.find_tables()

            # loop over the tables
            for i, table in enumerate(tables):

                # skip table 0 (it takes the page itself as one)
                if i == 0:
                    continue

                # store the starting x, starting y, end x, and end y values
                x0, top, x1, bottom = table.bbox
                
                # create a crop around the name section of the report
                name_end = 86
                name_box = (0, top, name_end, bottom)    
                name_cropped = page.crop(name_box)
                # extract the words in this bounded region
                name_words = name_cropped.extract_words()


                # do the exact same for classification
                classi_end = name_end + 50
                classi_box = (name_end + 5, top, classi_end, bottom)    
                classi_cropped = page.crop(classi_box)
                classi_words = classi_cropped.extract_words()


                # same for rank
                rank_end = classi_end + 40
                rank_box = (classi_end + 5, top, rank_end, bottom)    
                rank_cropped = page.crop(rank_box)
                rank_words = rank_cropped.extract_words()


                # same for CRN
                crn_box = (600, top, x0, bottom)    
                crn_cropped = page.crop(crn_box)
                crn_words = crn_cropped.extract_words()



                # create string to hold full name of professor
                name_string = ""
                for name_word in name_words:
                    name_string = name_string + " " + name_word['text']
                
                # split into first and last
                last, first = name_string.split(",", 1)
                first = first.strip()
                last = last.strip()

                # populate classification and rank values
                classification = None
                rank = None
                if (classi_words):
                    classification = classi_words[0]['text']
                if (rank_words):
                    rank = rank_words[0]['text']

                # get table data to extract enrollments and means
                table_data = table.extract()
                crns = []
                for k, crn_word in enumerate(crn_words):
                    supposed_crn = crn_word['text']
                    if (looks_like_crn(supposed_crn)):
                        crns.append(supposed_crn)
                
                if len(crns) != len(table_data):
                    raise ValueError(
                        f"Parse error: CRN/table row count mismatch (crns={len(crns)}, rows={len(table_data)})."
                    )

                for i, crn in enumerate(crns):
                    crn_enrollment = table_data[i][0]
                    crn_mean_score = table_data[i][2]
                    row = row_builder(first, last, classification, rank, crn, crn_enrollment, crn_mean_score)
                    #print(f"{row}\n", file=sys.stderr)
                    rows.append(row)

            print(f"Page {j+1} Finished\n", file=sys.stderr)

        return rows



def row_builder(fname: str, lname:str, cl:str, rank:str, crn:str, enrollment:str, average:str) -> dict:
    # normalize the average for insertion
    if (average == ''):
        newAvg = None
    else:
        newAvg = float(average)
    # normailze the enrollment for insertion'
    if (enrollment == ''):
        newEnroll = None
    else:
        newEnroll = int(enrollment)

    return {"first_name":fname,
            "last_name":lname,
            "instr_classification":cl,
            "instr_rank": rank,
            "crn": int(crn),
            "students_enrolled": newEnroll,
            "instr_rating_mean": newAvg}


def get_header_info(pdf) -> str:
    pages = pdf.pages[0:3]
    text = ""
    for page in pages:
        t = page.extract_text() or ""
        text += "\n" + t.lower()

    return text


def ensure_spot_report(headers: str) -> None:
    required = [
        "spot",
        "instructor overview",
        "sections taught",
    ]
    for need in required:
        if need not in headers:
            raise ValueError(f"Invalid PDF: not the expected SPOT Instructor Overview report.")
        

def looks_like_crn(s: str) -> bool:
    s = s.strip()
    return s.isdigit() and len(s) == 5


def compute_stat_rows(lst: list, semester: str, year: int) -> list:
    prof_stats = {}
    # loop over the spot list
    for row in lst:
        key = (row['first_name'].strip(), row['last_name'].strip())
        # handle case where we have not already seen the professors
        if key not in prof_stats:
            prof_stats[key] = {
                "first_name": row['first_name'].strip(),
                "last_name": row['last_name'].strip(),
                "semester": semester,
                "year": year,
                "sum": 0.0,
                "count": 0
            }
        # update vars if the rating actually exists
        if row['instr_rating_mean'] is not None:
            prof_stats[key]["sum"] += row['instr_rating_mean']
            prof_stats[key]["count"] += 1

    # final stats
    stats = []
    for prof in prof_stats.values():
        # only add the ones that have a valid count
        if prof["count"] > 0:
            stats.append({
                "first_name": prof["first_name"],
                "last_name": prof["last_name"],
                "semester": prof["semester"],
                "year": prof["year"],
                "rating": round(prof["sum"] / prof["count"], 2)
            })

    return stats


def process_report(pdf_path: str, report_data: dict) -> tuple[list, list]:
    rows = parse_pdf(pdf_path)
    stat_rows = compute_stat_rows(rows, report_data["semester"], report_data["year"])
    return rows, stat_rows


def main():
    if len(sys.argv) != 6:
        print("Usage: script pdf_path semester year user_pid filename", file=sys.stderr)
        sys.exit(2)

    pdf_path = sys.argv[1]
    semester = sys.argv[2]
    year = int(sys.argv[3])
    user_pid = sys.argv[4]
    filename = sys.argv[5]

    report_data = build_report_data(filename, semester, year, user_pid)
    rows, stat_rows = process_report(pdf_path, report_data)

    result = {
        "success": True,
        "report_data": report_data,
        "parsed_rows": rows,
        "parsed_stats": stat_rows,
        "rows_parsed": len(rows),
        "stats_built": len(stat_rows)
    }

    print(json.dumps(result))

if __name__ == "__main__":
    try:
        main()
        sys.exit(0)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Parser error: {e}", file=sys.stderr)
        sys.exit(1)