# Reddit clone

A learning project built incrementally with Spring Boot, React, TypeScript,
Tailwind CSS, and PostgreSQL.

## Current step: React account forms

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
uses these same username rules. There is no email field yet.

Password hashing is a one-way transformation; login will verify a submitted
password against the saved hash. Registration uses Spring Security's
password encoder. The database checks that the value
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

### Register an account

`POST /api/auth/register` accepts a JSON object with `username` and `password`.
The username must match the schema's 3–20 character rule. Passwords must be
nonblank and 12–128 characters long. Passwords are not trimmed or otherwise
modified; spaces and Unicode are allowed. No special-character or uppercase
composition rule is imposed.

After restarting Spring Boot, create a local demo account:

```bash
AUTH_COOKIES=$(mktemp)
AUTH_CSRF=$(curl -fsS -c "$AUTH_COOKIES" -b "$AUTH_COOKIES" http://localhost:8080/api/auth/csrf | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

curl -i http://localhost:8080/api/auth/register \
  -b "$AUTH_COOKIES" -c "$AUTH_COOKIES" \
  -H "X-CSRF-TOKEN: $AUTH_CSRF" \
  -H 'Content-Type: application/json' \
  -d '{"username":"DemoUser","password":"local-demo-passphrase"}'
```

Use this public demo password only for local practice. This request persists
an account. Success returns HTTP 201 and JSON containing only `id`, `username`,
and `createdAt`. Registration does not log the user in or create a session.

Repeat with `DemoUser` or `demouser` to receive HTTP 409. Try a username such
as `ab`, a short password, or missing fields to receive HTTP 400. Validation
errors use `application/problem+json` and include an `errors` object keyed by
field name, containing messages rather than rejected values. Malformed JSON
also returns 400 with a generic message. No raw password or stored hash is
included in a registration response.

How registration works:

1. `RegistrationController` parses the JSON into `RegistrationRequest`.
   `@Valid` applies Bean Validation constraints before invoking the service.
2. `RegistrationService` hashes the password through a `PasswordEncoder` bean.
   This is our first service layer: it coordinates account-creation rules
   separately from HTTP handling and SQL.
3. `UserRepository` inserts with bound parameters and `ON CONFLICT
   (lower(username)) DO NOTHING`. The unique index resolves duplicate names
   even during simultaneous requests. A conflict becomes HTTP 409; other
   database failures are not misreported as username conflicts.
4. The repository returns a `UserResponse` containing only public fields.

Hashing uses Spring Security's Argon2id implementation with Bouncy Castle,
a random 16-byte salt, a 32-byte hash, 19 MiB memory, two iterations, and
one lane. The encoded value stores the algorithm parameters and salt needed
for future password verification. Identical passwords produce different
stored values. This configuration follows the [OWASP Argon2id minimum](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html);
see [Spring Security password storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html).
The work factor should be evaluated on the eventual deployment hardware.

No schema migration is needed for registration because V2 already provides
the necessary columns. With session authentication enabled, registration
also requires a CSRF token; the preceding commands obtain one and retain its
associated session cookie. The React account forms perform these steps automatically.

`RegistrationApiTests` exercises real PostgreSQL inserts, salted hash
verification, duplicate names (including case differences), password length
boundaries, Unicode/spaces, invalid fields, malformed JSON, and credential
exclusion from responses. Its test rows are rolled back after each test.

### Session login, current user, and logout

| Endpoint | Behavior |
| --- | --- |
| `GET /api/auth/csrf` | Public; returns `headerName` and `token`, creating a session if needed |
| `POST /api/auth/login` | URL-encoded `username` and `password`; returns the public profile on success |
| `GET /api/auth/me` | Returns the signed-in profile, or 401 when signed out |
| `POST /api/auth/logout` | Requires CSRF; invalidates the session, clears the cookie, returns 204 |

Login uses Spring Security's form-login filter. Unlike registration, it
accepts `application/x-www-form-urlencoded`, not JSON. Username matching is
case-insensitive. Unknown accounts and incorrect passwords both return 401
with the same generic message. Security failures use `application/problem+json`;
missing or invalid CSRF tokens return 403.

Continue in the same terminal after the registration example (if `DemoUser`
already exists, use the password supplied when creating that local account):

```bash
curl -i http://localhost:8080/api/auth/login \
  -b "$AUTH_COOKIES" -c "$AUTH_COOKIES" \
  -H "X-CSRF-TOKEN: $AUTH_CSRF" \
  --data-urlencode 'username=DemoUser' \
  --data-urlencode 'password=local-demo-passphrase'

curl -i -b "$AUTH_COOKIES" http://localhost:8080/api/auth/me
```

Expect HTTP 200 for login and `/me`, with only `id`, `username`, and `createdAt`.
The `JSESSIONID` cookie identifies a server-side session; it does not contain
the password or profile. Spring changes the session ID on login, saves the
authenticated principal, and erases its password hash. The cookie is HttpOnly
and SameSite=Lax. Sessions expire after 30 minutes of inactivity and are
stored in memory, so restarting the backend signs users out. Set
`SESSION_COOKIE_SECURE=true` when deploying behind HTTPS.

CSRF tokens bind state-changing requests to the session. Obtain a fresh one
after login and after logout: authentication transitions clear the old token.
GET requests must not change account state. Using a header keeps the token
out of URLs; keep the session cookie with every request as well.

```bash
AUTH_CSRF=$(curl -fsS -c "$AUTH_COOKIES" -b "$AUTH_COOKIES" http://localhost:8080/api/auth/csrf | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

curl -i -X POST http://localhost:8080/api/auth/logout \
  -b "$AUTH_COOKIES" -c "$AUTH_COOKIES" \
  -H "X-CSRF-TOKEN: $AUTH_CSRF"

curl -i -b "$AUTH_COOKIES" http://localhost:8080/api/auth/me
rm "$AUTH_COOKIES"
```

Expect 204 for logout, then 401 for `/me`. A POST without a CSRF token should
return 403 even for public endpoints such as registration and login.

`SecurityConfiguration` defines the public routes, session handling, JSON
authentication errors, and standard login/logout handlers. `UserDetailsService`
loads an `AccountPrincipal` from PostgreSQL; Spring's authentication provider
verifies its password with our existing Argon2id encoder. `AuthController`
exposes the CSRF token and public account profile. Post reads and health remain
public; unlisted routes are denied until explicitly enabled.

`SessionAuthTests` uses tokens obtained from the real CSRF endpoint, exercising
login, session ID rotation, hash erasure, `/me`, generic credential errors,
missing/invalid tokens, token rotation, logout, and public reads. Registration
tests now include CSRF so they continue to check validation and persistence
through the security filters.

### Use accounts in the browser

With PostgreSQL, Spring Boot, and Vite running, open http://localhost:5173.
The header checks `/api/auth/me` when the app loads. Signed-out visitors see
**Log in** and **Sign up**; signed-in visitors see their username and **Log out**.
A failed account check displays a retry control and does not prevent public
post browsing.

Review these flows:

1. Open **Sign up** (`/register`) and create a unique local account. Check
   username/password requirements and accessible field labels. Successful
   registration takes you to `/login` with a success notice and username filled
   in. It does not sign you in automatically.
2. Enter a wrong password and verify the generic error. Then log in correctly.
   The app returns to the feed and displays your username in the header.
3. Reload or open a post. Your session should remain active and both light and
   dark themes should still work. Signed-in users visiting login/register are
   redirected to the feed.
4. Log out and reload. The header should show the signed-out controls.
5. Try registering the same username with different capitalization. Check the
   conflict message. Invalid fields show inline server errors when received,
   in addition to native browser validation.
6. Stop the backend and submit a form or reload the app. Check the error/retry
   behavior, then restart it and recover. A failed logout keeps the displayed
   account rather than falsely reporting success.
7. Check keyboard navigation, password-manager autocomplete, and a narrow
   browser window in both themes.

`AuthProvider` shares account state across the header and routes with React
Context. It restores the session from `/me`, and ignores stale restoration
responses after login/logout. `AuthPage` implements login and registration;
`AuthControls` handles the header. The API helper in `auth/api.ts` obtains a
fresh CSRF token before every POST, sends cookies using same-origin requests,
and retries a CSRF rejection once with a new token. Login uses a URL-encoded
body, registration uses JSON, and logout accepts an empty 204 response.

Only the public profile is held in React state. Passwords stay in the current
form and request body; neither credentials nor session tokens are written to
localStorage. The browser manages the HttpOnly session cookie. Requests have
timeouts, duplicate form submissions are disabled, and server field errors
are associated with the corresponding inputs. Error summaries receive focus.

Run `npm test` from `frontend/` for API-helper tests, and `npm run build` for
TypeScript checking and the production build. Tests cover account restoration,
cookies, request formats, CSRF renewal/retry, validation/conflict errors,
logout, and response validation. The browser checklist above verifies the
interactive forms and navigation.

## Development workflow

Implement one small step, run checks, review the behavior and code together,
then commit and push after review.

Repository: https://github.com/TomasCanevaro/reddit-clone
