-- Optional sample data for local development. Run manually, not through Flyway.
INSERT INTO posts (title, body, created_at)
SELECT sample.title, sample.body, sample.created_at
FROM (VALUES
    ('Welcome to our Reddit clone', 'Our first posts are now coming from PostgreSQL.', TIMESTAMPTZ '2026-01-01 10:00:00+00'),
    ('What are you learning this week?', 'Share a concept or project you have been exploring.', TIMESTAMPTZ '2026-01-02 10:00:00+00'),
    ('Small steps, working software', 'One feature at a time: database, API, then interface.', TIMESTAMPTZ '2026-01-03 10:00:00+00')
) AS sample(title, body, created_at)
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE posts.title = sample.title);
