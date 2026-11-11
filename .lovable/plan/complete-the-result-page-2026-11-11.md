# Complete the Result Page

## What will change
- Replace the placeholder Results page with a real score summary and question-by-question review using the completed, persisted attempt.
- Calculate each question using its own marks when present, otherwise the exam marking scheme; show unavailable answer keys as ungraded rather than incorrect.
- Add working status filters, collapsible question rows, a status-colored question index, section scoring, and timing only where timestamps exist.
- Preserve question order, images, snapshots, passages, and tables in the review. Keep the latest completed result accessible from the existing persisted attempt storage.

## Technical details
- Reuse the existing Zustand-persisted `AttemptExam` and `ExamAttempt`; do not add a database, change the extraction schema, or touch AI/PDF processing.
- Add a small pure scoring module with focused tests, then build the Results route using existing UI primitives and media renderers.
- Verify scoring tests, TypeScript, lint, production build, and the real completed-attempt rendering path where preview data permits. The current code has no visible Practice Set launch flow; result rendering will respect persisted `mode` and timing fields without inventing a practice attempt.
