# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Dev Task Manager (`artifacts/task-manager`)
- React + Vite frontend, served at `/`
- Quản lý task và theo dõi team dev tự động

### API Server (`artifacts/api-server`)
- Express 5 backend, served at `/api`

## Key Features
- **Check-in/Check-out tracking**: Theo dõi dev check-in đúng giờ (09:00 mặc định), check-out (18:00 mặc định)
- **Response time tracking**: Ghi lại thời gian hồi âm của dev khi được liên lạc
- **Daily reports**: Theo dõi dev có nộp báo cáo hàng ngày
- **Alert system**: Tạo alert khi dev đến muộn, thiếu check-in, thiếu báo cáo, phản hồi chậm
- **n8n integration**: Webhook endpoint + Trigger Daily Check để n8n automation gửi email alert

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Schema

Tables: `developers`, `checkins`, `responses`, `reports`, `alerts`

## n8n Integration

- **Webhook URL**: `<domain>/api/n8n/webhook` — nhận events từ n8n
- **Trigger Check**: `POST /api/n8n/trigger-check` — n8n gọi endpoint này theo lịch để tạo alerts tự động

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
