# Copilot Instructions for AI Prompt Coach

// CREATED_AUTOMATICALLY // VERIFY_OWNER_APPROVAL

## Summary
This repository is being transformed according to the **Cartrita Unified Workflow Automation Platform** master implementation prompt. The goal is to evolve the current AI prompt coaching application into a comprehensive workflow automation platform with n8n + Zapier + MCP + RAG parity.

## Current State
- Simple AI prompt coaching application with Express.js backend and React frontend
- Basic Gemini AI integration for text generation
- Firestore for data persistence
- Cloud Run deployment infrastructure

## Target Architecture (from Master Prompt)
- Workflow builder with visual canvas
- Trigger system (manual/webhook/cron)
- Node-based execution engine
- RAG (Retrieval Augmented Generation) module
- MCP (Model Context Protocol) integration
- Plugin/connector architecture
- Observability and governance layer

## Implementation Guidelines
1. **Additive-Only**: Preserve existing functionality while adding new features
2. **Phased Delivery**: Follow Phase A → B → C → D → E → F progression
3. **Zero-Length File Audit**: Review and resolve empty/placeholder files
4. **Spec-First**: Implement according to detailed specifications in master prompt
5. **Minimal Changes**: Make surgical, precise modifications

## Conflict Resolution
- Existing simple prompt API should remain functional
- New workflow automation features should be feature-gated
- Maintain backward compatibility with current frontend
- Preserve Cloud Run deployment structure

## Phase A Priorities (Current Focus)
1. Core schema and migration setup
2. Workflow runner service skeleton
3. Basic trigger system
4. Expression engine MVP
5. SSE streaming for real-time updates
6. Connector registry foundation

## Auto-Approval Policy
For Phase A implementation, proceed with:
- Schema additions (non-breaking)
- New service modules (additive)
- Empty file resolution (documented)
- Test infrastructure setup
- Documentation updates

Require manual approval for:
- Breaking changes to existing APIs
- Deletion of functional code
- Infrastructure modifications
- Security-related changes