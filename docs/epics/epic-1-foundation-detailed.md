# Epic 1: Foundation & Core Connectivity

**Epic Goal:** To establish the core application infrastructure, secure user authentication with Google, and enable the connection and ingestion of a user's data sources. By the end of this epic, we will have a functional, authenticated application capable of preparing data for analysis, providing a solid backbone for the features to come.

---

**Story 1.1: Initial Project Setup**
*As a developer, I want a bootstrapped Next.js and FastAPI application within a Monorepo, so that I have a clean, organized starting point for development.*
* **Acceptance Criteria:**
    1. A new Monorepo is initialized with the appropriate tooling.
    2. A Next.js application is created in the `/apps/web` directory.
    3. A Python FastAPI application is created in the `/apps/api` directory.
    4. Both applications can be started concurrently with a single command from the root.

**Story 1.2: User Authentication with Google**
*As a user, I want to sign in to the application using my Google account, so that my identity is securely verified and the app can request permissions.*
* **Acceptance Criteria:**
    1. A "Sign in with Google" button is present on the landing page.
    2. Clicking the button initiates the Google OAuth 2.0 authentication flow.
    3. Upon successful authentication, the user is redirected to a placeholder main application view.
    4. A user record is created in the database, and a session is established.

**Story 1.3: Data Source Permission Granting**
*As a logged-in user, I want a simple interface to grant the application read-only access to my Gmail and Google Drive, so that the agent can access the data it needs.*
* **Acceptance Criteria:**
    1. The main application view shows the connection status for Gmail and Google Drive (e.g., "Not Connected").
    2. A "Connect" button for each service initiates the appropriate Google OAuth permission screen.
    3. Upon successful granting of permissions, the UI updates to show "Connected."
    4. The application securely stores the necessary tokens to access the APIs on the user's behalf.

**Story 1.4: Project Scoping UI**
*As a connected user, I want an interface with filters for date range, keywords, and participants, so that I can define the data set for a new project analysis.*
* **Acceptance Criteria:**
    1. A "Create New Case Study" button is available.
    2. Clicking the button opens an interface (e.g., a modal) with input fields for date range, email participants, subject keywords, and a Google Drive folder selector.
    3. A "Begin Analysis" button exists to submit the filter criteria.

**Story 1.5: Backend Data Ingestion Pipeline**
*As the system, I want to receive a defined project scope and use the user's credentials to asynchronously fetch and index the content of the relevant emails and documents, so that they are ready for analysis.*
* **Acceptance Criteria:**
    1. A secure backend endpoint accepts the project scope filters from the UI.
    2. An asynchronous background job is triggered upon receiving a request.
    3. The job uses the user's stored tokens to fetch relevant data from the Google Gmail and Drive APIs.
    4. The textual content of the fetched data is processed and stored in the pgvector database.
    5. The system logs the successful completion of the ingestion job.