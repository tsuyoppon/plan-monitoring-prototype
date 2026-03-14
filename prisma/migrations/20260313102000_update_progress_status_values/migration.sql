-- Migrate legacy progress status value to the new taxonomy
UPDATE "progress_logs"
SET "progressStatus" = '相応の遅れ'
WHERE "progressStatus" = '遅れあり';
