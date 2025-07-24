# Epic 3: User Interaction & Persistence

**Epic Goal:** To transform the core generation feature into a complete product loop by building the features that allow users to manage, review, and refine their case studies, and to provide the critical feedback loop for our evaluation system.

---

## Implementation Status Summary

As of July 2025, Epic 3 stories have the following implementation status:

- **Story 3.1**: ✅ **COMPLETED** - Case study persistence fully implemented
- **Story 3.2**: ✅ **COMPLETED** - Dashboard and history view fully implemented  
- **Story 3.3**: ✅ **COMPLETED** - Case study retrieval and display fully implemented
- **Story 3.4**: ✅ **COMPLETED** - Text editing functionality implemented (manual save)
- **Story 3.5**: ⚠️ **PARTIALLY IMPLEMENTED** - Evaluation UI exists but has bugs
- **Story 3.6**: 🔄 **PENDING** - Navigation routing consistency fix needed
- **Story 3.7**: 🔄 **PENDING** - Star rating independence fix needed  
- **Story 3.8**: ✅ **COMPLETED** - Delete functionality fully implemented

---

**Story 3.1: Persist Generated Case Study** ✅ **COMPLETED**
*As the system, I want to automatically save the successfully generated markdown case study to the database, so that the user's work is not lost and can be accessed later.*
* **Acceptance Criteria:**
    1. ✅ After a markdown stream is complete, the final text content is saved to the relational database.
    2. ✅ The saved case study is correctly associated with the user's ID and the project scope filters that were used to generate it.
    3. ✅ A unique identifier is created for the new case study.

**Implementation Details:**
- Complete database schema in `/apps/api/models/case_study.py` with CaseStudy, CaseStudySection, and related models
- Auto-save functionality implemented in streaming generation endpoint (`/apps/api/routers/case_study_router.py`)
- Full content, metadata, and generation parameters properly stored

**Story 3.2: Dashboard and History View** ✅ **COMPLETED**
*As a user, I want to see a dashboard listing all my previously generated case studies, so that I can easily access and review my past work.*
* **Acceptance Criteria:**
    1. ✅ A "Dashboard" or "History" link is present in the application's navigation.
    2. ✅ This view fetches and displays a list of all case studies saved by the current user.
    3. ✅ Each item in the list shows at least a title (or a summary of the project scope) and the date it was created.
    4. ✅ The list is sorted with the most recently created study at the top.

**Implementation Details:**
- Full Dashboard component at `/apps/web/components/Dashboard.tsx`
- Search and filtering capabilities by status (all, completed, generating, pending, failed)
- Rich case study cards showing project name, status, summary, metadata, and key insights
- API endpoint `/case-study/` returns paginated and sorted case studies

**Story 3.3: View and Re-open a Case Study** ✅ **COMPLETED**
*As a user, I want to open a past case study from my dashboard, so that I can review the agent's findings.*
* **Acceptance Criteria:**
    1. ✅ Clicking on a case study in the dashboard navigates the user to the main split-screen application view.
    2. ✅ The saved markdown content of the selected study is loaded and rendered in the right-hand canvas.
    3. ✅ The project scope filters used for the study are displayed for context on the left.

**Implementation Details:**
- Dashboard cards are clickable and call `onSelectStudy(study)` callback
- Case study service includes `getCaseStudy(id)` method for individual retrieval
- Full content loading and display functionality implemented
- API endpoint `/case-study/{id}` returns complete case study data

**Story 3.4: Simple Text Editing** ✅ **COMPLETED**
*As a user, I want to be able to click into the canvas and make simple text edits to the markdown, so that I can correct or refine the agent's output.*
* **Acceptance Criteria:**
    1. ✅ The canvas area displaying the markdown is an editable text field.
    2. ⚠️ Changes made by the user are saved automatically after a short delay (e.g., using a debounce function). *Note: Currently manual save*
    3. ✅ The updated document is persisted in the database.

**Implementation Details:**
- Canvas component (`/apps/web/components/Canvas.tsx`) includes edit/preview toggle
- Text editing via textarea with markdown content
- Manual save button triggers `onSave` callback
- Content changes properly propagated through `onContentChange`
- **Enhancement Opportunity**: Auto-save with debounce could be added

**Story 3.5: Implement Evaluation UI** ⚠️ **PARTIALLY IMPLEMENTED**
*As a user, after a new case study is generated, I want to be prompted to provide feedback on its quality, so that I can help evaluate the system's performance.*
* **Acceptance Criteria:**
    1. ✅ After a new case study stream completes, a simple feedback UI (e.g., a banner or small modal) appears.
    2. ⚠️ The UI provides a 1-5 star rating mechanism for "Accuracy" and "Usefulness." *Note: Currently linked/synchronized*
    3. ❌ A text input is available for qualitative comments.
    4. ❌ Submitting the feedback saves the evaluation data to the database, associated with the specific case study.
    5. ✅ The user can dismiss the feedback UI without submitting.

**Implementation Details:**
- Rating UI exists in Canvas footer with star rating interface
- **Bug**: Accuracy and usefulness ratings are currently linked (Story 3.7 addresses this)
- **Missing**: Comment input field and database persistence
- **Missing**: API endpoints for evaluation submission

**Story 3.6: Fix Left Panel Routing Inconsistency** 🔄 **PENDING**
*As a user, I want the "create new study" link in the left panel and the "define project scope" button in the chat to navigate to the same route, so that I have a consistent and predictable user experience regardless of which entry point I use.*
* **Acceptance Criteria:**
    1. The left panel "create new study" link and chat "define project scope" button navigate to the same route
    2. Both entry points provide the same user experience and interface
    3. Navigation behavior is consistent across all scenarios
    4. No broken or incorrect redirects occur

**Implementation Status:** This is a bug fix for routing inconsistency that needs to be addressed.

**Story 3.7: Fix Rate Study Stars Linking Issue** 🔄 **PENDING**
*As a user, I want to provide separate star ratings for accuracy and usefulness when evaluating a case study, so that I can give nuanced feedback that reflects different aspects of the AI-generated content quality.*
* **Acceptance Criteria:**
    1. Accuracy star rating operates independently from usefulness star rating
    2. Users can select different star values for accuracy and usefulness
    3. Each rating system maintains its own state and visual feedback
    4. Star selections are properly stored and retrieved independently

**Implementation Status:** Current Canvas component has rating UI but accuracy/usefulness ratings are synchronized - needs independent state management.

**Story 3.8: Add Delete Case Studies Option** ✅ **COMPLETED**
*As a user, I want to delete case studies from my dashboard that I no longer need, so that I can keep my workspace organized and remove outdated or irrelevant analyses.*
* **Acceptance Criteria:**
    1. ✅ Delete button/option available for each case study in the dashboard
    2. ✅ Confirmation dialog prevents accidental deletions
    3. ✅ Successful deletion removes case study from database and UI
    4. ✅ User receives clear feedback when deletion is successful or fails

**Implementation Details:**
- Delete API endpoint implemented: `DELETE /case-study/{id}` 
- CaseStudyService includes `deleteCaseStudy(id)` method
- Proper user authorization validation (users can only delete their own studies)
- Returns success/error responses appropriately