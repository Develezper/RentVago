# RentVago

Proyecto base con Next.js + TypeScript + Tailwind listo para empezar desarrollo.

## Package Manager

Este repositorio usa solo Bun.

- Instalar: bun install
- Desarrollo: bun dev
- Build: bun run build
- Lint: bun run lint

El uso de npm, yarn y pnpm esta bloqueado por preinstall.

## Estructura

- src/app
- src/components
- src/lib
- src/agents
- src/workers

## Arquitectura

- Arquitectura actual: capas tecnicas (layered, folder-by-type)
- Arquitectura objetivo: Clean Architecture
- Estrategia: migracion incremental por modulo/feature, sin big-bang rewrite

### Reglas de transicion

- El dominio no debe depender de infraestructura
- Los casos de uso orquestan dominio y puertos
- La infraestructura implementa puertos, no reglas de negocio
- Cada feature nueva debe acercar el codigo al objetivo Clean

## Variables de entorno

Usa .env.example como base para crear tu .env.local.
