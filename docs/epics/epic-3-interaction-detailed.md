# Epic 3: User Interaction & Persistence

**Epic Goal:** To transform the core generation feature into a complete product loop by building the features that allow users to manage, review, and refine their case studies, and to provide the critical feedback loop for our evaluation system.

---

**Story 3.1: Persist Generated Case Study**
*As the system, I want to automatically save the successfully generated markdown case study to the database, so that the user's work is not lost and can be accessed later.*
* **Acceptance Criteria:**
    1. After a markdown stream is complete, the final text content is saved to the relational database.
    2. The saved case study is correctly associated with the user's ID and the project scope filters that were used to generate it.
    3. A unique identifier is created for the new case study.

**Story 3.2: Dashboard and History View**
*As a user, I want to see a dashboard listing all my previously generated case studies, so that I can easily access and review my past work.*
* **Acceptance Criteria:**
    1. A "Dashboard" or "History" link is present in the application's navigation.
    2. This view fetches and displays a list of all case studies saved by the current user.
    3. Each item in the list shows at least a title (or a summary of the project scope) and the date it was created.
    4. The list is sorted with the most recently created study at the top.

**Story 3.3: View and Re-open a Case Study**
*As a user, I want to open a past case study from my dashboard, so that I can review the agent's findings.*
* **Acceptance Criteria:**
    1. Clicking on a case study in the dashboard navigates the user to the main split-screen application view.
    2. The saved markdown content of the selected study is loaded and rendered in the right-hand canvas.
    3. The project scope filters used for the study are displayed for context on the left.

**Story 3.4: Simple Text Editing**
*As a user, I want to be able to click into the canvas and make simple text edits to the markdown, so that I can correct or refine the agent's output.*
* **Acceptance Criteria:**
    1. The canvas area displaying the markdown is an editable text field.
    2. Changes made by the user are saved automatically after a short delay (e.g., using a debounce function).
    3. The updated document is persisted in the database.

**Story 3.5: Implement Evaluation UI**
*As a user, after a new case study is generated, I want to be prompted to provide feedback on its quality, so that I can help evaluate the system's performance.*
* **Acceptance Criteria:**
    1. After a new case study stream completes, a simple feedback UI (e.g., a banner or small modal) appears.
    2. The UI provides a 1-5 star rating mechanism for "Accuracy" and "Usefulness."
    3. A text input is available for qualitative comments.
    4. Submitting the feedback saves the evaluation data to the database, associated with the specific case study.
    5. The user can dismiss the feedback UI without submitting.