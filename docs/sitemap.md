# graph TD

    A[Landing Page] --> B{User Authenticated?};
    B -->|No| C[Authentication View];
    B -->|Yes| D[Dashboard / History View];
    C --> D;
    D -->|If Empty State| E[First-Time User Guide];
    D -->|Create New| F[Main Application View];
    F --> G[Project Scoping View];
    G --> F;
    D -->|Selects Past Study| F;