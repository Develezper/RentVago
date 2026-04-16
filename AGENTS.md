<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Architecture Roadmap

- Current architecture: layered (folder-by-type)
- Target architecture: Clean Architecture
- Transition model: incremental per feature/module

### Mandatory Rules During Transition

- Keep business rules in domain-oriented code, not in infra adapters.
- New use cases should depend on abstractions (ports), not frameworks.
- Infrastructure code may implement ports, but must not own business logic.
- Prefer changes that move boundaries toward Clean Architecture.
