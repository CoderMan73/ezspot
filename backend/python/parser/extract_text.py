import pdfplumber as pp
import sys
import json
import os
import mysql.connector



def connection_setup():
    # get env vars
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME")
    # create connection
    conn = mysql.connector.connect(
    host=host,
    user=user,
    password=password,
    database=database
    )

    return conn, conn.cursor()


def build_report_data(filename: str, user_pid: str) -> dict:
    return {
        "filename": filename,
        "processing_status": "Procesing",
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

                # same for year 
                year_box = (rank_end + 120, top, rank_end + 175, bottom)
                year_cropped = page.crop(year_box)
                year_words = year_cropped.extract_words()



                # create string to hold full name of professor
                name_string = ""
                for name_word in name_words:
                    name_string = name_string + " " + name_word['text']
                
                # split into first and last
                last, first = name_string.split(",", 1)
                # skip empty first or last names
                if (first == '' or last == ''):
                    continue

                first = first.strip()
                last = last.strip()

                # populate classification and rank values
                classification = None
                rank = None
                if (classi_words):
                    classification = classi_words[0]['text']
                if (rank_words):
                    rank = rank_words[0]['text']

                # handle year data
                # get all the date values for the given table and save the positioning 
                terms = []
                for year_word in year_words:
                    txt = year_word["text"].strip()
                    if txt.isdigit() and len(txt) == 6:
                        terms.append({
                            "term": txt,
                            "year": int(txt[:4]),
                            "top": year_word["top"]
                        })


                # get table data to extract enrollments and means
                table_data = table.extract()
                crns = []
                # loop over crns and make sure they work while also appending
                # location data that we can compare against later 
                for k, crn_word in enumerate(crn_words):
                    supposed_crn = crn_word["text"].strip()
                    if looks_like_crn(supposed_crn):
                        crns.append({
                            "crn": supposed_crn,
                            "top": crn_word["top"],
                            "year": None
                        })
                
                # update year values for the crns
                if len(terms) == 0:
                    raise ValueError("Parse error: no term values found in year box.")

                elif len(terms) == 1:
                    # only one term in this section, so all rows get that year
                    for crn_entry in crns:
                        crn_entry["year"] = terms[0]["year"]

                else:
                    # loop over the crns and those under the line need the second year
                    # while those above get the first
                    first_year = terms[0]["year"]
                    second_year = terms[1]["year"]
                    switch_top = terms[1]["top"]

                    for crn_entry in crns:
                        if crn_entry["top"] < switch_top:
                            crn_entry["year"] = first_year
                        else:
                            crn_entry["year"] = second_year

                
                if len(crns) != len(table_data):
                    raise ValueError(
                        f"Parse error: CRN/table row count mismatch (crns={len(crns)}, rows={len(table_data)})."
                    )

                # build the rows
                for i, crn_entry in enumerate(crns):
                    crn = crn_entry["crn"]
                    row_year = crn_entry["year"]

                    crn_enrollment = table_data[i][0]
                    crn_mean_score = table_data[i][2]

                    row = row_builder(
                        first,
                        last,
                        classification,
                        rank,
                        crn,
                        crn_enrollment,
                        crn_mean_score,
                        row_year
                    )
                    rows.append(row)

            print(f"Page {j+1} Finished\n", file=sys.stderr)

        return rows



def row_builder(fname: str, lname:str, cl:str, rank:str, crn:str, enrollment:str, average:str, year:int) -> dict:
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
            "instr_rating_mean": newAvg,
            "year": year}


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


def compute_stat_rows(lst: list) -> list:
    prof_stats = {}
    # loop over the spot list
    for row in lst:
        key = (row['first_name'].strip(), row['last_name'].strip())
        # handle case where we have not already seen the professors
        if key not in prof_stats:
            prof_stats[key] = {
                "first_name": row['first_name'].strip(),
                "last_name": row['last_name'].strip(),
                "year": row["year"],
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
                "year": prof["year"],
                "rating": round(prof["sum"] / prof["count"], 2)
            })

    return stats


def process_report(pdf_path: str, report_data: dict) -> tuple[list, list]:
    rows = parse_pdf(pdf_path)
    stat_rows = compute_stat_rows(rows)
    return rows, stat_rows


# Returns exit code  
def insert_spot_rows(spot_rows: list, report_id: int, cursor) -> bool:
    # handle no given spot rows
    if (spot_rows is None):
        return 1
    # create querey
    query = """
    INSERT INTO spot_rows
    (report_id, first_name, last_name, instr_classification, instr_rank, crn, students_enrolled, instr_rating_mean, year)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    # create values list from spot_rows
    values_list = []
    for row in spot_rows:
        values_list.append((
            report_id,
            row["first_name"],
            row["last_name"],
            row["instr_classification"],
            row["instr_rank"],
            row["crn"],
            row["students_enrolled"],
            row["instr_rating_mean"],
            row["year"]

        ))
    # execute the queries with the values
    cursor.executemany(query, values_list)
    return 0


# Returns exit code 
def insert_stat_rows(stat_rows: list, report_id: int, cursor) -> bool:
    # handle no given spot rows
    if (stat_rows is None):
        return 1
    # create querey
    query = """
    INSERT INTO statistics
    (report_id, year, rating, instr_first_name, instr_last_name)
    VALUES (%s, %s, %s, %s, %s)
    """
    # create values list from spot_rows
    values_list = []
    for row in stat_rows:
        values_list.append((
            report_id,
            row["year"],
            row['rating'],
            row['first_name'],
            row['last_name']
        ))
    # execute the queries with the values
    cursor.executemany(query, values_list)
    return 0
    
def update_report_status(report_id: int, status: str, curr):
    query = """
    UPDATE report_upload SET processing_status = %s WHERE report_id = %s;
    """
    curr.execute(query, [status, report_id])
    
   


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
            update_report_status(report_id, 'Processed', curr)
        else:
            update_report_status(report_id, 'Failed', curr)

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
            update_report_status(report_id, 'Failed', curr)
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