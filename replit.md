# FlyGate

## Overview

FlyGate is an aviation-focused Application Control Interface (ACI) for cockpit tablets, similar to CarPlay but designed for flight operations. The system provides fast mode switching between duty states (OFF_DUTY, ON_DUTY, FLIGHT_MODE), fixed flight ops tiles, and trusted device management for pilot tablets. It's a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a dark theme optimized for cockpit visibility, using the Oxanium font family for aviation aesthetics.

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API with `/api/aci/*` endpoints
- **State Management**: In-memory state machine for ACI duty states

Key backend modules:
- `server/aci-state.ts`: Manages duty state transitions and app capabilities per state
- `server/routes.ts`: API endpoint definitions
- `server/storage.ts`: User storage abstraction (currently in-memory)

### State Machine Design
The ACI operates with three duty states:
1. **OFF_DUTY**: No apps active, device can be detached
2. **ON_DUTY**: Ground operations apps (Ops, Docs, Comms, Maintenance, Weather)
3. **FLIGHT_MODE**: Flight-critical apps (Flight Ops, Navigation, Checklists, Performance, Comms, Weather, Maps, Security)

Trusted device attachment/detachment triggers state transitions.

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Current Schema**: Basic users table with id, username, password
- **Migrations**: Generated to `./migrations` directory via `drizzle-kit push`

### Build System
Custom build script (`script/build.ts`) that:
1. Builds frontend with Vite to `dist/public`
2. Bundles server with esbuild to `dist/index.cjs`
3. Selectively bundles common dependencies to reduce cold start times

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle ORM for type-safe queries
- connect-pg-simple for session storage (available but not currently used)

### UI Framework
- shadcn/ui components (pre-configured in `components.json`)
- Radix UI primitives for accessibility
- Lucide React for icons
- Tailwind CSS v4 with tw-animate-css

### Development Tools
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)
- Custom meta-images plugin for OpenGraph image handling

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and validation
- `zod`: Schema validation
- `wouter`: Client-side routing
- `express`: HTTP server
- `tsx`: TypeScript execution for development