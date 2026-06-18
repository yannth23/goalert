# Football Match Notifier

This project is an MVP (Minimum Viable Product) for a football match notification system. It features a Next.js frontend, a NestJS backend, and integrates with various services for data storage, caching, scheduling, and email notifications.

## Table of Contents

- [Features](#features)
- [Architecture & Technologies](#architecture--technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Deployment Strategy](#deployment-strategy)
- [Contributing](#contributing)
- [License](#license)

## Features

The MVP includes the following core functionalities:

1.  **User Registration and Authentication:** Secure user accounts with JWT-based authentication.
2.  **Favorite Teams Management:** Users can select and manage their favorite football teams.
3.  **Daily Match Fetching:** Integration with an external soccer API to fetch daily match schedules.
4.  **Redis Caching:** Cache fetched match data to improve performance and reduce API calls.
5.  **Homepage Display:** Display daily football matches to users.
6.  **Daily Email Notifications:** Users receive email notifications containing matches involving their favorite teams.
7.  **User Preferences:** A dedicated page for users to manage their notification settings.

## Architecture & Technologies

The project follows a modern microservice-oriented architecture with a clear separation of concerns:

*   **Frontend:**
    *   **Next.js:** A React framework for building server-side rendered and static web applications.
*   **Backend:**
    *   **NestJS:** A progressive Node.js framework for building efficient, reliable, and scalable server-side applications.
    *   **PostgreSQL + Prisma:** PostgreSQL as the primary database, managed by Prisma ORM for type-safe database interactions and migrations.
    *   **Redis Cache:** Used for caching frequently accessed data and improving response times.
    *   **BullMQ:** For robust background job processing and scheduling daily tasks (e.g., fetching matches, sending emails).
    *   **Resend:** For reliable email notification delivery.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or Yarn
*   Docker (optional, for local PostgreSQL and Redis setup)

### Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public" # Or your Neon URL
REDIS_HOST="localhost" # Or your Upstash host
REDIS_PORT=6379 # Or your Upstash port
REDIS_PASSWORD="" # Your Upstash password, if applicable
JWT_SECRET="YOUR_SUPER_SECRET_KEY" # A strong, random key for JWT
RESEND_API_KEY="YOUR_RESEND_API_KEY"
RESEND_FROM_EMAIL="GoalAlert <noreply@yourdomain.com>"
FOOTBALL_DATA_API_KEY="YOUR_FOOTBALL_API_KEY" # Key for football-data.org

# WhatsApp via Z-API (app.z-api.io)
ZAPI_INSTANCE_ID="YOUR_INSTANCE_ID"  # ID da instância no painel Z-API
ZAPI_TOKEN="YOUR_INSTANCE_TOKEN"     # Token da instância
ZAPI_CLIENT_TOKEN="YOUR_CLIENT_TOKEN" # Client Token da conta (Conta > Security)
```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [your-repository-url]
    cd [your-project-directory]
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    # or yarn install
    ```

3.  **Install Frontend Dependencies (To be implemented later):**
    ```bash
    # cd ../frontend
    # npm install
    # or yarn install
    ```

### Database Setup

1.  **Start PostgreSQL and Redis (Local using Docker):**
    ```bash
    # Example for docker-compose.yml:
    # version: '3.8'
    # services:
    #   db:
    #     image: postgres:13
    #     environment:
    #       POSTGRES_USER: user
    #       POSTGRES_PASSWORD: password
    #       POSTGRES_DB: dbname
    #     ports:
    #       - "5432:5432"
    #   redis:
    #     image: redis:6.2-alpine
    #     ports:
    #       - "6379:6379"
    #
    # docker-compose up -d
    ```
    If using Neon, ensure your `DATABASE_URL` is configured correctly in `.env`.

2.  **Run Prisma Migrations:**
    ```bash
    cd backend
    npx prisma migrate dev --name init # Use the actual migration name if different
    npx prisma generate
    ```

### Running the Application

1.  **Run the Backend:**
    ```bash
    cd backend
    npm run start:dev
    # or yarn start:dev
    ```
    The backend will typically run on `http://localhost:3000`.

2.  **Run the Frontend (To be implemented later):**
    ```bash
    # cd frontend
    # npm run dev
    # or yarn dev
    ```
    The frontend will typically run on `http://localhost:3001`.

## Deployment Strategy

The MVP is designed for cost-effective deployment using serverless and managed services:

*   **Frontend:** Vercel (for Next.js hosting)
*   **Backend:** Render (for NestJS web service)
*   **Database:** Neon PostgreSQL (serverless database)
*   **Redis:** Upstash (serverless Redis for caching and queues)
*   **Email:** Resend (for email notifications)

This stack leverages free tiers where possible, providing a robust yet economical starting point for the MVP.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to the project's coding standards.
4.  Write appropriate tests.
5.  Submit a pull request.

## License

This project is licensed under the MIT License.
