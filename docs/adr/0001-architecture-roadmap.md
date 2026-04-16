# ADR 0001: Architecture Roadmap

- Status: Accepted
- Date: 2026-04-16

## Context

The project starts as a Next.js application with a layered technical structure
(folder-by-type).

The team wants to evolve the codebase toward Clean Architecture to improve:

- Testability
- Separation of concerns
- Long-term maintainability
- Ability to scale by domain/features

## Decision

We keep a layered structure as the current baseline and adopt an incremental
migration strategy to Clean Architecture.

This is not a full rewrite.

Each feature/module change should move architecture boundaries in the right
direction.

## Architectural States

- Current state: Layered architecture (technical folders)
- Target state: Clean Architecture (domain/use-cases/ports/adapters)
- Transition model: Incremental per feature/module

## Transition Rules

1. Business rules belong to domain-oriented code.
2. Use cases coordinate domain logic through ports (abstractions).
3. Infrastructure implements ports and framework-specific details.
4. Domain/use-cases must not depend on framework code.
5. New work should prefer target boundaries over adding technical coupling.

## Migration Phases

1. Baseline hardening
   - Keep strict TypeScript and lint rules.
   - Enforce import aliases and module boundaries.
2. Feature-by-feature extraction
   - Introduce use-case layer for modified features.
   - Move business logic from UI/infra into domain/use-cases.
3. Port/adapters consolidation
   - Define explicit ports in use-cases.
   - Move external integrations to infrastructure adapters.
4. Cleanup and governance
   - Remove obsolete legacy patterns.
   - Add architectural checks to CI where possible.

## Consequences

### Positive

- Lower coupling over time
- Better testing strategy
- Safer feature evolution

### Trade-offs

- Temporary coexistence of mixed patterns
- Slightly higher design overhead during transition

## References

- AGENTS.md (operational architecture rules)
- README.md (project-level architecture summary)
