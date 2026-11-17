# JewelAgentLab — AI-Powered Jewellery Sales Assistant

An AI-powered jewellery sales assistant built with **Python, FastAPI, LangGraph, ChromaDB, Redis, MySQL, React and Docker**.

JewelAgentLab helps jewellery sales teams manage product catalogues, discover products using natural language, and handle customer email enquiries with AI-assisted workflows and human approval.

## Key Features

### 1. AI-Powered Product Management
- Upload jewellery products and images.
- Extract product attributes using AI vision models.
- Review and edit AI-generated attributes.
- Submit products for administrator approval.
- Automatically index approved products for AI search.

### 2. Intelligent Jewellery Search
- Natural-language product search.
- Structured filtering for categories, prices and attributes.
- Semantic vector search using ChromaDB.
- Hybrid retrieval combining keyword and vector search.
- LangGraph-based workflow orchestration.
- Intelligent routing between rule-based and AI-powered processing.

### 3. AI Email Assistant
- Gmail OAuth integration.
- Gmail inbox synchronization.
- AI-powered email classification.
- Customer enquiry analysis.
- Product-aware AI reply generation.
- Human review and approval before sending.
- Gmail API email sending with audit tracking.

### 4. Authentication and Administration
- JWT authentication.
- Admin and Staff roles.
- Role-based access control enforced in FastAPI.
- Product approval and rejection workflows.
- Staff account management.

## Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React, Vite, Tailwind CSS |
| Database | MySQL |
| AI Orchestration | LangGraph |
| LLM and Embeddings | OpenAI API |
| Vector Database | ChromaDB HTTP Server |
| Background Processing | Redis, RQ |
| Email Integration | Gmail API, OAuth 2.0 |
| Infrastructure | Docker, Docker Compose, Nginx, AWS EC2 |

## System Architecture

```text
React Frontend
      |
      v
FastAPI Backend
      |
      +---- MySQL
      |
      +---- LangGraph AI Agent
      |         |
      |         +---- Structured Search
      |         +---- Hybrid Retrieval
      |         +---- OpenAI Models
      |         +---- ChromaDB HTTP Server
      |
      +---- Redis / RQ
      |         |
      |         +---- Product Indexing Worker
      |         +---- Indexing Dispatcher
      |         +---- Gmail Worker
      |         +---- Gmail Scheduler
      |
      +---- Gmail API
```

## Product Indexing Workflow

1. Staff uploads a product and its images.
2. AI analyzes the jewellery attributes.
3. Staff reviews and submits the product.
4. Admin approves the submission.
5. The indexing dispatcher queues a background job.
6. The RQ worker generates embeddings.
7. ChromaDB stores the indexed product.
8. The approved product becomes available for AI search.

## AI Email Workflow

1. Gmail Scheduler initiates inbox synchronization.
2. Gmail Worker retrieves customer enquiries.
3. LangGraph classifies incoming emails.
4. Relevant jewellery products are retrieved.
5. AI generates a suggested reply.
6. An authorized user reviews and approves the draft.
7. The approved email is sent through the Gmail API.

## Docker Architecture

The application uses separate Docker services for:

- FastAPI backend
- React frontend served by Nginx
- MySQL
- Redis
- ChromaDB HTTP Server
- Product indexing worker
- Indexing dispatcher

Gmail background services are configured separately for environments where email synchronization is enabled.

Persistent Docker volumes store database records, product images and vector indexes.

## Security

- JWT-based authentication
- Backend-enforced role permissions
- Environment-based secret configuration
- Admin approval for product publication
- Human approval before AI-generated email sending
- Separate application data and persistent storage

## Local Development

The backend and frontend can run locally using Python and Node.js.

For containerized deployment, configure the required environment variables using `.env.example` as a reference.

```bash
docker compose --env-file docker/demo.env up -d
```

Create the database tables and initial administrator account:

```bash
docker compose --env-file docker/demo.env run --rm backend python -m app.setup_db
```

The Docker environment requires valid configuration values and credentials. Do not commit real `.env` files.

## Live Demo

**Website:** https://demo.jewelagentlab.com

Deployment in progress.

## Project Purpose

JewelAgentLab demonstrates practical AI engineering capabilities, including agent orchestration, retrieval-augmented generation, background processing, application security, human-in-the-loop workflows and containerized deployment.

The project is designed to demonstrate an end-to-end AI application rather than a standalone chatbot.