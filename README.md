# UnlazyApp

UnlazyApp is an MVP (Minimum Viable Product) application designed to help intermediate trainees track their workout sessions. It provides a straightforward and effective way to log exercises, repetitions, and weights, allowing users to monitor their progress over time. A core feature is the ability to generate motivating AI-powered summaries of training sessions, offering valuable insights and encouragement. The application aims to address the user's need for a structured way to track their efforts and stay motivated.

## Tech Stack

This project leverages a modern and robust technology stack to deliver a responsive and efficient user experience.

*   **Frontend:**
    *   Angular 19: A powerful framework for building single-page applications, providing a rich set of components and strong community support.
    *   TypeScript 5: A superset of JavaScript that adds static typing, enhancing code maintainability and refactoring capabilities.
    *   Angular Material: A comprehensive UI component library implementing Material Design, ensuring a consistent and responsive interface across various devices.

*   **Backend:**
    *   Supabase: Utilized as a Backend-as-a-Service (BaaS), offering a ready-to-use infrastructure including:
        *   PostgreSQL: A high-performance, scalable relational database.
        *   Supabase Auth: For comprehensive user authentication, including email and password management.
        *   Supabase Edge Functions: For serverless logic and integration with external APIs.

*   **AI Integration:**
    *   OpenRouter API: Used for generating AI-powered summaries of workout sessions, integrated securely via Supabase Edge Functions.

*   **Testing:**
    *   Jasmine: A behavior-driven development (BDD) framework for unit testing JavaScript code.
    *   Karma: A test runner that executes Jasmine tests across multiple browsers, providing a flexible testing environment.
    *   Angular Testing Utilities: Tools like `TestBed`, `fakeAsync`, and `tick` provided by Angular for effective testing of components and services.

*   **CI/CD & Hosting:**
    *   GitHub Actions: For automating testing, migrations, and deployments, ensuring continuous integration and delivery.
    *   DigitalOcean: Used for hosting the application and static files, offering scalability and competitive pricing.

## Getting Started Locally

To set up and run UnlazyApp on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd unlazy-app
    ```
    (Replace `<repository-url>` with the actual URL of your GitHub repository.)

2.  **Install dependencies:**
    Navigate into the project directory and install all required Node.js packages using npm:
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    This application uses Supabase for its backend. You will need to configure your Supabase project URL and public API key. Please refer to the Supabase documentation for detailed instructions on setting up your project and obtaining these credentials, which typically involve setting environment variables.

4.  **Start the development server:**
    Once dependencies are installed and configuration is set, launch the application:
    ```bash
    ng serve
    ```
    This command will start a local development server. Open your web browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Available Scripts

In the project directory, you can run the following commands:

*   `npm start`:
    ```bash
    ng serve
    ```
    Runs the application in development mode. Opens `http://localhost:4200/` in your browser. The page will reload if you make edits.

*   `npm run build`:
    ```bash
    ng build
    ```
    Builds the project for production. The build artifacts will be stored in the `dist/` directory.

*   `npm run watch`:
    ```bash
    ng build --watch --configuration development
    ```
    Compiles the application in watch mode during development.

*   `npm test`:
    ```bash
    ng test
    ```
    Executes the unit tests via [Karma](https://karma-runner.github.io).

*   `npm run lint`:
    ```bash
    ng lint
    ```
    Runs linting checks on the project code to identify and report problematic patterns.

*   `npm run e2e`:
    ```bash
    ng e2e
    ```
    Runs end-to-end tests. Note that Angular CLI does not come with an end-to-end testing framework by default; you can choose and configure one that suits your needs.

## Project Scope

UnlazyApp is developed as an MVP with a defined set of core functionalities and explicit exclusions.

**Included MVP Functionalities:**

*   **User Authentication:** Registration, login, and logout via Supabase Auth, ensuring secure access to individual training data.
*   **Workout Session Management:** Full CRUD (Create, Read, Update, Delete) operations for training sessions, including date/time, description, and location. Sessions are listed with pagination and sorted by newest.
*   **Exercise Series Management:** CRUD operations for individual exercise series within a session, including exercise selection (from 20 predefined exercises), repetitions (1-300), and weight (0.01-400 kg).
*   **Automatic Statistics Calculation:** Real-time calculation and display of total kilograms lifted and total repetitions for each session.
*   **AI Summary Generation:** On-demand generation of motivational workout summaries using the OpenRouter API via Supabase Edge Functions. Summaries are stored, automatically removed upon exercise series modification, and feature single-operation locking, a 30-second timeout, and graceful degradation.
*   **Validation and Error Handling:** Robust input validation for numeric limits and text lengths, clear error messages displayed in modals, and retention of form data during validation errors.
*   **Responsive User Interface:** Designed with a mobile-first approach using Angular Material, ensuring functionality across phones, tablets, and desktops.

**Excluded from this MVP (Future Considerations):**

*   **Filtering and Searching:** No advanced filtering or searching functionalities for sessions or series.
*   **Extended Exercise Management:** No support for custom exercise names, exercises without weight, or other units of weight (only kilograms).
*   **Advanced Analytical Features:** Excludes charts, advanced statistics, session comparison, trend analysis, or data export.
*   **Advanced AI Features:** No AI-driven training recommendations, automatic training plan generation, or exercise technique analysis.
*   **Other Exclusions:** No measurement of session duration, no support for cardio exercises without weights, no automatic flag clearing mechanism for system failures, and no analytical logging for AI functions.

## Project Status

UnlazyApp is currently in its **MVP (Minimum Viable Product)** phase, as indicated by version `0.0.0`. The project is considered complete as an MVP when all defined user stories are implemented and tested, the AI summary generation feature is fully integrated, the application is deployed and accessible online, technical and user documentation is complete, positive usability tests with target users are achieved, and all course requirements are met.
