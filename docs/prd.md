# AI Case Study Generation Agent Product Requirements Document (PRD)

### 1. Goals and Background Context

#### Goals
The primary goals of this Product Requirements Document are to define a system that can:
* Automate the creation of insightful, retrospective case studies from unstructured project data.
* Drastically reduce the manual effort and time required for project reporting and analysis.
* Enable teams to learn from past project data, reducing the recurrence of preventable mistakes.
* Provide a simple, intuitive user experience that allows for the generation of a complete case study in under 5 minutes.

#### Background Context
Valuable knowledge from completed projects is frequently lost because it is scattered across numerous unstructured sources like emails and documents. This "project amnesia" leads to repeated mistakes and missed opportunities for process improvement. Existing tools fail to solve this, as they either track tasks without capturing the project's narrative or require intense manual effort to synthesize information.

This document outlines the requirements for an AI agent that directly solves this problem by automating the synthesis process. The system will connect to a user's data, intelligently analyze it, and generate dynamic, insight-driven case studies, turning communication chaos into actionable knowledge.

#### Change Log
| Date | Version | Description | Author |
|---|---|---|---|
| July 20, 2025 | 1.0 | Initial Draft | John (PM) |

---

### 2. Requirements

#### Functional
1.  **FR1:** The system shall allow a user to authenticate using their Google Workspace (Gmail and Drive) account via OAuth 2.0.
2.  **FR2:** The system shall provide an interface for the user to define a "project scope" using filters (e.g., date range, participants, keywords, Drive folder).
3.  **FR3:** The system shall ingest and index the content of emails and documents within the defined project scope. This process must run asynchronously in the background.
4.  **FR4:** The user shall be able to initiate a case study generation for a defined project scope via a chat interface.
5.  **FR5:** The system's AI agent shall analyze the indexed data to synthesize a narrative case study based on dynamic patterns found in the content.
6.  **FR6:** The system shall render the generated case study in real-time in a side-panel view, formatted as GitHub Flavored Markdown.
7.  **FR7:** The user shall be able to perform simple text edits on the generated markdown document within the side-panel.
8.  **FR8:** The system shall persist the generated case study, its associated project scope, and links to its source materials for future user sessions.
9.  **FR9:** The system shall include a user feedback mechanism (e.g., star ratings, comments) to evaluate the accuracy and usefulness of each generated case study.

#### Non-Functional
1.  **NFR1:** The user interface shall be a responsive web application that functions correctly on the latest versions of all modern desktop browsers (Chrome, Firefox, Safari, Edge).
2.  **NFR2:** All user data, both in transit (TLS 1.2+) and at rest, must be encrypted.
3.  **NFR3:** The system's use of Google APIs must adhere to all of Google's terms of service, including their data privacy and security policies.
4.  **NFR4:** The real-time markdown rendering in the side-panel must update smoothly without perceptible user lag.
5.  **NFR5:** The UI shall include fluid animations and loading states to indicate when the agent is processing, providing a high-quality, interactive user experience.

---

### 3. User Interface Design Goals (Revised)

#### Overall UX Vision
The user experience should be clean, modern, and intuitive. Our guiding principle is **"Transparent Automation"**: the user should always have a clear understanding of what the AI agent is doing. The interface must build trust by making the complex backend process feel simple and observable through fluid animations and real-time updates.

#### Key Interaction Paradigms
* **Conversational Interface:** The primary method for user interaction will be a chat-based input. The chat is used to initiate requests and for any follow-up Q&A *after* a case study has been generated.
* **Live-Updating Canvas:** A core feature will be the split-screen view where the user can watch the case study being constructed in real-time. During the generation process, the chat input will be disabled to ensure the agent can complete its workflow without interruption.
* **Filter-Based Scoping:** Users will define the boundaries of a project using a simple and powerful filtering interface, rather than complex forms.

#### Core Screens and Views
* **Authentication View:** A simple, clean interface to handle the Google OAuth authentication flow.
* **First-Time User Experience / Empty State:** A dedicated view for new users that guides them to connect their data sources and create their first case study.
* **Main Application View:** The primary split-screen layout, with the chat interface on one side and the live-updating canvas on the other.
* **Dashboard / History View:** A view where users can see, search, and re-open their previously generated case studies.
* **Project Scoping View:** An interface (likely a modal or dedicated panel) for applying the filters that define a project's data set.

#### Accessibility
* **WCAG AA:** The application should meet WCAG 2.1 AA standards. (Note: This is a significant commitment that will be factored into our development time and effort).

#### Branding & Animation
* The application will have a minimalist and slick aesthetic, leveraging the design conventions of **shadcn/ui**. The focus will be on excellent typography, generous white space, and purposeful animations.
* It will feature a set of **"Agent Status Animations"** to provide clear visual feedback for states like "Thinking," "Connecting to Data," "Analyzing Documents," and "Writing."

#### Target Device and Platforms
* **Web Responsive:** The application will be a responsive web app. The primary user experience, including case study generation and editing, is optimized for a desktop view. The mobile-responsive view will prioritize a high-quality, read-only experience for viewing completed studies.

---

### 4. Technical Assumptions

#### Repository Structure: Monorepo
We will use a Monorepo to manage the codebase. This approach is ideal for a full-stack application as it simplifies dependency management and ensures consistency between the frontend and backend, particularly for shared types and utilities.

#### Service Architecture
The architecture will consist of a decoupled frontend application and a backend service communicating via a well-defined API. This provides clear separation of concerns, allowing for independent development and scaling of the front and back ends.

#### Testing Requirements
We will adopt a full testing pyramid strategy, including:
* **Unit Tests:** To verify individual functions and components in isolation.
* **Integration Tests:** To ensure different parts of the application (e.g., API service and database) work together correctly.
* **End-to-End (E2E) Tests:** To validate critical user flows from the user's perspective.

#### Additional Technical Assumptions and Requests
* **Frontend:** The frontend will be built with **Next.js**, styled with **Tailwind CSS**, and use **shadcn/ui** and **Radix** for components. Animations will be implemented with **Framer Motion**.
* **Backend:** The backend will be built in **Python** using the **FastAPI** framework. Agentic logic will be orchestrated with **LangGraph**.
* **Database:** Persistence will be handled by **PostgreSQL** with the **pgvector** extension for semantic search capabilities.
* **Authentication:** User authentication will be handled via **Google Workspace OAuth 2.0**.
* **Deployment:** The final deployment platform will be decided by the Architect, with a strong preference for platforms like Vercel for the frontend and a container or serverless service for the backend.

---

### 5. Epic List

* **Epic 1: Foundation & Core Connectivity**
    * **Goal:** To establish the core application infrastructure, secure user authentication with Google, and enable the connection and ingestion of a user's data sources into the agent's memory.

* **Epic 2: Case Study Generation & V1 Canvas**
    * **Goal:** To implement the primary agent workflow that analyzes the ingested data, synthesizes a case study using a basic narrative pattern, and renders it in the real-time, split-screen canvas.

* **Epic 3: User Interaction & Persistence**
    * **Goal:** To implement the dashboard for viewing past studies, enable simple text editing on the canvas, and build the user feedback and evaluation system.

---

### Epic 1: Foundation & Core Connectivity

**Epic Goal:** To establish the core application infrastructure, secure user authentication with Google, and enable the connection and ingestion of a user's data sources. By the end of this epic, we will have a functional, authenticated application capable of preparing data for analysis, providing a solid backbone for the features to come.

**(Stories 1.1 - 1.5 as previously detailed)**

---

### Epic 2: Case Study Generation & V1 Canvas

**Epic Goal:** To deliver the core value of the application by implementing the agent's primary synthesis capability and the innovative real-time canvas UI. By the end of this epic, a user will be able to submit a scoped project and watch as the agent constructs a meaningful, narrative-driven case study from their data.

**(Stories 2.1 - 2.4 as previously detailed)**

---

### Epic 3: User Interaction & Persistence

**Epic Goal:** To transform the core generation feature into a complete product loop by building the features that allow users to manage, review, and refine their case studies, and to provide the critical feedback loop for our evaluation system.

**(Stories 3.1 - 3.5 as previously detailed)**

---

### 6. Checklist Results Report

**Final Verdict: READY FOR ARCHITECT**

---

### 7. Next Steps

#### UX Expert Prompt
This project requires a detailed UI/UX specification. Please review the attached PRD, specifically the 'User Interface Design Goals' section, and create the `front-end-spec.md` document. Pay close attention to the requirements for a split-screen layout, real-time canvas, and agent status animations.

#### Architect Prompt
This project requires a comprehensive full-stack architecture. Please review the attached PRD, especially the 'Technical Assumptions' and the detailed epics/stories, to create the `fullstack-architecture.md` document. The architecture must support the decoupled Next.js/Python stack and the real-time data streaming requirements.