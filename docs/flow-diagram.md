sequenceDiagram
    participant User
    participant Frontend
    participant Backend

    User->>Frontend: Clicks "Create New Study"
    Frontend->>User: Shows Project Scoping View
    User->>Frontend: Enters filters and clicks "Begin Analysis"
    Frontend->>Backend: Sends project scope request
    activate Backend
    Frontend->>User: Displays "Analyzing Data" animation
    Backend-->>Frontend: Acknowledges request (job started)
    deactivate Backend
    
    Note over Backend: Asynchronous data processing and synthesis...
    
    Backend->>Frontend: Streams generated markdown
    activate Frontend
    Frontend->>User: Displays "Writing..." animation and renders markdown in real-time
    deactivate Frontend
    Backend-->>Frontend: Signals completion
    Frontend->>User: Shows "Evaluation UI" prompt