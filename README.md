# RentVago

Base project with Next.js + TypeScript + Tailwind, ready to start development.

## Package Manager

This repository uses Bun only.

- Install: bun install
- Development: bun dev
- Build: bun run build
- Lint: bun run lint

Using npm, yarn, and pnpm is blocked by the preinstall check.

## Structure

- src/app
- src/components
- src/lib
- src/agents
- src/workers

## Architecture

- Current architecture: technical layers (layered, folder-by-type)
- Target architecture: Clean Architecture
- Strategy: incremental migration per module/feature, without a big-bang rewrite

### Transition Rules

- Domain must not depend on infrastructure
- Use cases orchestrate domain and ports
- Infrastructure implements ports, not business rules
- Every new feature should move the codebase closer to the Clean target

## Environment Variables

Use .env.example as the base to create your .env.local.

## Docker

``` bash
    docker compose up -d
```

``` bash
    docker compose down
``` 
## Local AI Inference Engine

This project uses [Ollama](https://ollama.com/) and the **Phi-3** model to run intelligent agents locally. This approach ensures data privacy and eliminates external API costs during development.

### Prerequisites

1. **Install Ollama:** Download and install it from [ollama.com](https://ollama.com/).
2. **Download the Model:** Open your terminal and run the following command to get the lightweight Phi-3 model:
   ```bash
   ollama pull phi3