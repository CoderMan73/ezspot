SELECT
    sr.first_name,
    sr.last_name,
    sr.instr_classification,
    sr.instr_rank,
    sr.crn,
    sr.students_enrolled,
    sr.instr_rating_mean
FROM spot_rows sr
INNER JOIN (
    SELECT
        first_name,
        last_name
    FROM spot_rows
    WHERE report_id = %s
    GROUP BY first_name, last_name
    HAVING SUM(COALESCE(students_enrolled, 0)) >= 30
       AND COUNT(DISTINCT crn) >= 3
       AND AVG(instr_rating_mean) >= 5.2
) eligible ON sr.first_name = eligible.first_name
         AND sr.last_name = eligible.last_name
WHERE sr.report_id = %s
ORDER BY sr.last_name ASC, sr.first_name ASC, sr.crn ASC