SELECT
    first_name,
    last_name,
    MAX(COALESCE(instr_rank, '')) AS instr_rank,
    MAX(COALESCE(instr_classification, '')) AS instr_classification,
    SUM(COALESCE(students_enrolled, 0)) AS total_students,
    COUNT(DISTINCT crn) AS total_courses,
    ROUND(AVG(instr_rating_mean), 2) AS avg_rating
FROM spot_rows
WHERE report_id = %s
GROUP BY first_name, last_name
HAVING SUM(COALESCE(students_enrolled, 0)) >= 30
   AND COUNT(DISTINCT crn) >= 3
   AND AVG(instr_rating_mean) >= 5.2
ORDER BY avg_rating DESC
LIMIT 30