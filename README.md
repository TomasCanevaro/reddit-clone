# Reddit clone

A learning project built incrementally with Spring Boot, React, TypeScript,
Tailwind CSS, and PostgreSQL.

## Current step: frontend connection screen

The backend uses Java 25, Spring Boot, Maven, and PostgreSQL 18. The frontend
uses React, TypeScript, Tailwind CSS, and Vite. The first screen checks the
backend's health, including its database connection.

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
(none exist yet) and `\q` to exit.

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

The browser requests `/actuator/health` from Vite on port 5173. Vite proxies
that request to Spring Boot on port 8080, and Spring Boot checks PostgreSQL
on port 5433. This development proxy avoids cross-origin browser requests.
Production hosting will need its own routing to the backend; the Vite dev
server is not a production server.

### Review the connection screen

- With both services running, the screen should show **Connected**.
- Stop the backend with Ctrl+C, then click **Check again**. The screen should
  show **Unavailable** after the request fails or times out.
- Restart the backend and check again to recover.
- With the backend running, stop PostgreSQL using `sudo docker compose stop
  postgres`. Checking again should show **Needs attention**. Restart it with
  `sudo docker compose up -d --wait` and check again to recover.

The screen checks once on load and when you click the button; it does not poll.

### Run checks

Frontend type checking and production build:

```bash
cd frontend
npm run build
```

Start PostgreSQL first. The integration test starts the Spring application
context and executes `SELECT current_database()` through JDBC against the
local development database. It does not modify data.

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
- `frontend/src/App.tsx`: connection request, typed UI states, and screen.
- `frontend/src/main.tsx`: mounts the React application into the HTML page.
- `frontend/src/index.css`: imports Tailwind and sets global styles.
- `frontend/vite.config.ts`: React/Tailwind plugins and development proxy.
- `frontend/package.json` and `frontend/package-lock.json`: npm scripts,
  dependencies, and reproducible dependency versions.

Spring Web provides HTTP support and the embedded web server. Actuator supplies
the health endpoint without a custom controller. Spring JDBC provides database
access and a connection pool; the PostgreSQL JDBC driver translates those
requests into PostgreSQL's protocol. Tables and schema migrations come later.

## Development workflow

Implement one small step, run checks, review the behavior and code together,
then commit and push after review.

Repository: https://github.com/TomasCanevaro/reddit-clone
