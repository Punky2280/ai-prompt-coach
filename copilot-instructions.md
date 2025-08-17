# Copilot Instructions for AI Prompt Coach Repository

// CREATED_AUTOMATICALLY // VERIFY_OWNER_APPROVAL

## Overview
This repository contains a transformation project from a simple AI Prompt Coach application to a Cartrita Unified Workflow Automation Platform as specified in the master implementation prompt.

## Current State
- **Backend**: Express.js application with Firestore integration and Gemini API
- **Frontend**: React/TypeScript application with Vite
- **Infrastructure**: Google Cloud deployment via Terraform

## Master Prompt Reference
This repository is being developed according to the "Cartrita Unified Workflow Automation Platform (n8n + Zapier + MCP + RAG Parity)" master implementation prompt.

## Key Directives
1. **Additive-only approach**: Preserve existing functionality while building new workflow capabilities
2. **Phase-based delivery**: Following PHASE A through PHASE F roadmap
3. **Zero-length file audit**: Required before implementation
4. **Feature gating**: RAG, MCP, and Marketplace features behind environment flags
5. **Observability**: All new operations must include tracing spans
6. **Security**: No direct eval, strict sandboxing for expressions

## Conflict Resolution
No conflicts identified between this document and the master prompt. Both emphasize:
- Incremental, surgical changes
- Preservation of existing functionality
- Spec-first approach
- Proper testing and validation

## Implementation Status
- [ ] Phase A: Core schema, runner, basic triggers and nodes
- [ ] Phase B: Advanced workflow features
- [ ] Phase C: RAG integration
- [ ] Phase D: MCP endpoints
- [ ] Phase E: Governance
- [ ] Phase F: Marketplace optimization

## Notes
- Current AI Prompt Coach functionality should remain operational
- New workflow automation features will be added as additional capabilities
- Database migrations will be append-only
- All changes require proper testing and documentation