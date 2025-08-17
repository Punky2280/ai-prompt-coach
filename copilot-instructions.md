# Copilot Instructions - Cartrita Workflow Automation Platform

// CREATED_AUTOMATICALLY // VERIFY_OWNER_APPROVAL

## Project Overview
This repository is being transformed from an "AI Prompt Coach" application into the **Cartrita Unified Workflow Automation Platform** - a comprehensive workflow automation system with n8n/Zapier-like capabilities, enhanced with RAG (Retrieval-Augmented Generation) and MCP (Model Context Protocol) integrations.

## Master Implementation Prompt Reference
This project follows the specifications outlined in the Master Implementation Prompt titled "Cartrita Unified Workflow Automation Platform (n8n + Zapier + MCP + RAG Parity)". All development must adhere to its directives including:

- Phase-based delivery approach (A through F)
- Zero-length file audit protocol
- Minimal, surgical changes philosophy
- Spec-first, additive-only development
- Feature gating for advanced capabilities

## Current State
- **Base Technology**: Node.js/Express backend, React/TypeScript frontend
- **Infrastructure**: Google Cloud Run deployment with Terraform
- **Database**: Google Firestore
- **AI Integration**: Google Gemini API

## Development Constraints
1. **Backward Compatibility**: Preserve existing AI prompt functionality during transformation
2. **Incremental Migration**: Transform components gradually while maintaining system stability
3. **Feature Flags**: Use environment variables to gate new workflow automation features
4. **API Consistency**: Maintain {success, data?, error?} response format
5. **Security First**: Implement RBAC, secrets management, and audit logging from Phase A

## Auto-Approval Policies
- Empty file preservation with skeleton implementation is approved for critical service files
- Migration-only database schema changes are auto-approved
- Feature-flagged additions that don't modify existing endpoints are auto-approved

## Architecture Evolution Path
1. **Phase A**: Core workflow schema, basic runner, trigger system
2. **Phase B**: Advanced execution features (parallelism, branching, retries)
3. **Phase C**: RAG integration and knowledge capabilities  
4. **Phase D**: MCP protocol support and plugin architecture
5. **Phase E**: Governance, policy engine, audit querying
6. **Phase F**: Marketplace and performance optimizations

## Verification Requirements
- All new database operations must include tracing spans
- Expression engine must use sandboxed evaluation (no direct eval)
- Secrets must be redacted in logs and responses
- Graph validation required before workflow execution
- Feature flags must be respected for RAG, MCP, and Marketplace features

## Implementation Notes
- Current CommonJS backend should be gradually migrated to support ES modules for plugin loading
- Frontend React components can be extended in place for workflow builder UI
- Existing Gemini integration provides foundation for AI workflow nodes
- Terraform infrastructure supports the scalability requirements