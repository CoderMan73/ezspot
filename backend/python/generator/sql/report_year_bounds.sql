SELECT MIN(year), MAX(year)
FROM spot_rows
WHERE report_id = %s
