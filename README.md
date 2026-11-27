# Reddit clone

A learning project built incrementally with Spring Boot, React, TypeScript,
Tailwind CSS, and PostgreSQL.

## Current step: users table

The backend uses Java 25, Spring Boot, Maven, and PostgreSQL 18. The frontend
uses React, TypeScript, Tailwind CSS, and Vite. The feed displays the newest posts from the backend API.

### Start PostgreSQL

From the repository root, with Docker Engine running:

```bash
sudo docker compose up -d --wait
sudo docker compose ps
```

Compose downloads the official PostgreSQL image and creates the database,
user, and named volume. The health check waits for PostgreSQL to accept
connections. Host port 5433 is published only on localhost and maps to port
5432 inside the container. This avoids conflicting with a local PostgreSQL
installation using its default port, 5432. Spring Boot connects to localhost:5433.

The credentials (`reddit` / `local_dev_only`) are public local development
defaults, not deployment secrets. The database name is `reddit_clone`.
For deployment, configure separate credentials and provide the backend's
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and
`SPRING_DATASOURCE_PASSWORD` environment variables.

### Inspect the database

```bash
sudo docker compose exec postgres psql -U reddit -d reddit_clone
```

Inside psql, run `SELECT current_database();`. Use `\dt` to list tables
and `\q` to exit. After starting the backend or running its tests, you should
see `posts` and `flyway_schema_history`.

`sudo docker compose stop` stops PostgreSQL. Start it again with
`sudo docker compose up -d --wait`. `sudo docker compose down` removes the
container and network but keeps the named volume and its database data.
Adding `--volumes` to `down` deletes the database data.

PostgreSQL's initialization credentials apply only when the data volume is
empty. Editing Compose credentials later does not change an existing user's
password.

### Run the backend

From a WSL Ubuntu terminal with JDK 25 installed:

```bash
cd backend
./mvnw spring-boot:run
```

The Maven wrapper downloads the project's Maven version on its first run.
Maven then downloads the dependencies declared in `pom.xml`.

In another terminal:

```bash
curl http://localhost:8080/actuator/health
```

The response should contain `"status":"UP"`; it may also list health groups.
Actuator now checks the database connection as part of overall health.
With PostgreSQL stopped, the endpoint reports `DOWN` with HTTP 503.
Stop the server with Ctrl+C.

### Run the frontend

With PostgreSQL and the backend running, open another WSL terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. `npm ci` installs the versions recorded in
`frontend/package-lock.json`; it is needed after cloning or dependency changes.
Vite updates the page as you edit the source files.

The browser requests `/api/posts` from Vite on port 5173. Vite proxies
that request to Spring Boot on port 8080, and Spring Boot queries PostgreSQL
on port 5433. Production hosting will need its own backend routing; the Vite
development server is not a production server.

### Review the post feed

- Start PostgreSQL, Spring Boot, and Vite. Seed posts using the command below
  if desired. The page should display post titles, bodies, and local dates,
  newest first.
- Click **Refresh** to fetch the latest list again.
- Stop the backend, then refresh. The page should display an error and a
  **Try again** button. Restart the backend and retry to recover.
- For an empty database, the page shows **No conversations yet**. Do not
  delete existing data just to test this state.
- Use the browser Network panel's throttling to observe the loading state;
  the refresh button is disabled until the request completes.
- Check a narrow browser window and keyboard navigation to the refresh button.
- Use the header's theme toggle to switch light/dark mode, then reload to
  verify persistence. Check post cards and loading, empty, and error states
  in both themes. The first visit uses your system preference; explicit choices
  are stored under `reddit-clone-theme` in localStorage. When storage is
  unavailable, the toggle still works for the current page.

The feed loads once on mount and on refresh, without polling. It renders text
as plain React content, preserves body line breaks, and wraps long content.
The health endpoint is still available at http://localhost:8080/actuator/health.

### Run checks

Frontend type checking and production build:

```bash
cd frontend
npm run build
```

Frontend API response-handling tests (Node.js 24+):

```bash
cd frontend
npm test
```

Start PostgreSQL first. The integration tests start the Spring application,
apply pending migrations, verify the database connection, and check post
storage and title constraints. Test inserts are rolled back; migrations
remain applied. Run these tests against the local development database.

```bash
cd backend
./mvnw test
```

### Understand the files

- `backend/pom.xml`: Java version, dependencies, and build configuration.
- `backend/mvnw` and `backend/.mvn/`: Maven wrapper, so a separate Maven
  installation is unnecessary.
- `backend/src/main/java/com/tomas/redditclone/RedditCloneApplication.java`:
  application entry point; Spring Boot configures and starts the web server.
- `backend/src/main/resources/application.properties`: application settings.
- `backend/src/test/java/`: automated tests.
- `backend/target/`: generated build output, excluded from Git.
- `frontend/src/App.tsx`: shared header and page routes.
- `frontend/src/posts/FeedPage.tsx`: feed request lifecycle and loading, empty, error, and success states.
- `frontend/src/posts/PostPage.tsx`: individual post fetching, retry, and missing-post states.
- `frontend/src/posts/api.ts`: API response types, validation, and fetch function.
- `frontend/src/posts/PostCard.tsx`: reusable display for one post.
- `frontend/src/main.tsx`: mounts the React application into the HTML page.
- `frontend/src/index.css`: imports Tailwind and sets global styles.
- `frontend/vite.config.ts`: React/Tailwind plugins and development proxy.
- `frontend/package.json` and `frontend/package-lock.json`: npm scripts,
  dependencies, and reproducible dependency versions.

Spring Web provides HTTP support and the embedded web server. Actuator supplies
the health endpoint without a custom controller. Spring JDBC provides database
access and a connection pool; the PostgreSQL JDBC driver translates those
requests into PostgreSQL's protocol. Flyway manages database schema migrations.

### Understand the first migration

`backend/src/main/resources/db/migration/V1__create_posts.sql` creates:

| Column | Meaning |
| --- | --- |
| `id` | Database-generated numeric primary key |
| `title` | Required title, up to 300 characters; empty or space-only values are rejected |
| `body` | Text content; defaults to an empty string |
| `created_at` | Timestamp with time zone, set automatically on insertion |

An index on creation time and ID supports the upcoming newest-first feed.
Authors, communities, and sample posts will be added in later steps.

Spring Boot runs Flyway on startup using our existing database connection.
Flyway discovers `V1__create_posts.sql`: `V1` is the version, the double
underscore separates it from the description. It records applied migrations
and their checksums in `flyway_schema_history`. Restarting the backend does
not recreate the table. Once a migration is shared/applied, add a new version
(such as `V2__...sql`) for changes instead of editing the old file.

After restarting the backend, inspect the schema from the repository root:

```bash
sudo docker compose exec postgres psql -U reddit -d reddit_clone -c '\d posts'
sudo docker compose exec postgres psql -U reddit -d reddit_clone -c 'SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;'
```

These migrations manage structure; sample content is loaded separately.

### Read posts through the API

Restart the backend after updating the code, then run:

```bash
curl http://localhost:8080/api/posts
```

The endpoint returns a JSON array containing the 50 newest posts, ordered by
`created_at DESC, id DESC`. If no posts exist, it returns `[]` with HTTP 200.
This initial limit bounds the response; pagination will be added later.
Each post contains `id`, `title`, `body`, and `createdAt` (an ISO-8601 timestamp).

To load optional sample posts, run from the repository root:

```bash
sudo docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U reddit -d reddit_clone < backend/dev/seed-posts.sql
```

The script skips sample titles that already exist when rerun sequentially.
It is intended for local development, and never runs automatically in production.

Request flow:

1. Spring routes `GET /api/posts` to `posts/PostController.java`.
2. The controller calls `PostRepository.findLatest()`.
3. The repository uses `JdbcTemplate` to query PostgreSQL and map rows to
   `Post` records. Spring provides dependencies through their constructors.
4. Spring serializes the returned list into JSON using Jackson.

There is no service layer yet because this endpoint has no business rules
beyond reading posts. We can introduce one when those rules appear.
The React feed displays this endpoint's posts. There are no voting,
commenting, or creation controls yet.

`PostApiTests` verifies the HTTP response with real database queries: empty
results, field mapping, newest-first order, timestamp ties, and the 50-post
limit. Its inserts and deletes occur inside transactions rolled back after
each test, preserving existing posts (identity sequences can still advance).

### Read an individual post

`GET /api/posts/{id}` returns a single post with `id`, `title`, `body`, and
`createdAt`. Restart Spring Boot after pulling code changes, then use an ID
returned by the feed:

```bash
curl -i http://localhost:8080/api/posts/61
```

Replace `61` with an existing post ID. An existing post returns HTTP 200
and a JSON object. A missing post returns HTTP 404 with an empty body.
Nonnumeric IDs or values outside Java's `long` range return HTTP 400.

`@PathVariable` converts the URL segment into a `long`. The repository uses
`WHERE id = ?` with a bound parameter and returns an `Optional<Post>`.
`ResponseEntity.of(...)` maps a present post to 200 and absence to 404.
Both repository queries share a row mapper so their post fields stay aligned.
No database migration is needed for this endpoint.

API tests cover a found post, a missing post, a nonnumeric ID, and an ID
outside the supported numeric range.

### Open a post in the frontend

React Router maps `/` to `FeedPage` and `/posts/:id` to `PostPage`. `Link`
updates the URL without reloading the whole application. `useParams` reads
the post ID; the page fetches `/api/posts/{id}` rather than relying on feed
data, so direct links and page reloads also work. The header and theme toggle
are shared across routes. Unrecognized routes display a page-not-found view.

Review with the backend and frontend running:

- Click a post title in the feed. Check the full title, body, date, and URL.
- Use **Back to feed**, browser back/forward, and the header home link.
- Reload the post URL or open it in another tab.
- Open `/posts/0` for a missing post and `/posts/abc` for an invalid ID.
- Open an unknown URL such as `/missing` for the page-not-found view.
- Stop the backend, reload a post page, and check the retry state. Restart
  the backend and use **Try again** to recover.
- Verify both themes and keyboard navigation through post links.

The API helper returns `null` specifically for 404, throws for request failures
or malformed data, and preserves abort signals. Requests are cancelled on
navigation and time out after 12 seconds. Frontend tests cover the API helper;
the routing and visual states also require browser review.

For future production hosting, route frontend URLs such as `/posts/61` back
to `index.html` while routing `/api` to Spring Boot. Vite handles this fallback
during development. A frontend not-found view does not change the development
server's HTTP response code to 404.

### Users schema

`V2__create_users.sql` creates the `users` table. Flyway applies it on the
next backend startup or integration test run, after V1.

| Column | Meaning |
| --- | --- |
| `id` | Database-generated numeric primary key |
| `username` | 3–20 ASCII letters, digits, underscores, or hyphens |
| `password_hash` | Required, nonblank encoded password value, up to 255 characters |
| `created_at` | Timestamp with time zone, generated on insertion |

The unique index on `lower(username)` prevents duplicate names regardless
of case while preserving the original spelling. The registration API will
use these same username rules. There is no email field or account API yet.

Password hashing is a one-way transformation; login will verify a submitted
password against the saved hash. We will implement this with Spring Security's
password encoder in the registration step. The database checks that the value
is present, but cannot prove it is a secure password hash. The schema tests
use an explicit placeholder; it is not a real account credential.

Start PostgreSQL and run the backend tests to apply and verify V2:

```bash
sudo docker compose up -d --wait
cd backend
./mvnw test
```

From the repository root, inspect the table and migration history:

```bash
sudo docker compose exec postgres psql -U reddit -d reddit_clone -c '\d users'
sudo docker compose exec postgres psql -U reddit -d reddit_clone -c 'SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;'
```

`UsersSchemaTests` verifies storage, generated IDs/timestamps, duplicate and
case-insensitive usernames, username format, and required password hashes.
Test rows are rolled back. The existing posts schema and API are unchanged;
we will link posts to authors when we add authenticated posting.

## Development workflow

Implement one small step, run checks, review the behavior and code together,
then commit and push after review.

Repository: https://github.com/TomasCanevaro/reddit-clone
