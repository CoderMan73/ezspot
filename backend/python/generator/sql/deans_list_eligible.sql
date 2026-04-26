SELECT
    first_name,
    last_name
FROM spot_rows
WHERE report_id = %s
GROUP BY first_name, last_name
HAVING SUM(COALESCE(students_enrolled, 0)) >= %s
   AND COUNT(DISTINCT crn) >= %s
   AND AVG(instr_rating_mean) >= %s
ORDER BY last_name ASC, first_name ASC
