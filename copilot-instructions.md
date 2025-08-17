# Copilot Instructions for AI Prompt Coach / Cartrita Workflow Platform

// CREATED_AUTOMATICALLY // VERIFY_OWNER_APPROVAL

## Master Prompt Reference
This repository is being developed according to the "Cartrita Unified Workflow Automation Platform" master implementation prompt, targeting Phase C implementation (RAG ingestion & retrieval, embedding pipeline, augmented answer node).

## Current State Assessment
- **Existing Application**: AI Prompt Coach (Express.js backend + React frontend)
- **Target Architecture**: Workflow automation platform with n8n + Zapier + MCP + RAG parity
- **Current Phase**: Transitioning to Phase C (RAG implementation)

## Key Constraints from Master Prompt
- Incremental, additive-only changes
- Forward-only schema evolution  
- API response shape: `{success:boolean, data?:any, error?:string}`
- Feature gating via environment flags
- No circular dependencies
- Instrument all DB operations with tracing spans
- Redact secrets always

## Development Approach
- Spec-first implementation
- Mark uncertainties with `// VERIFY`
- Work in review-ready slices
- Maintain Dev Log entries

## File Header Template
```javascript
// PURPOSE: <describe>
// PHASE: A|B|C|...  
// STATUS: skeleton|partial|complete
// VERIFY: <assumptions>
// TODO:
// 1.
// 2.
```

## Conflict Resolution
**MAJOR DISCREPANCY IDENTIFIED**: The existing codebase is a simple AI prompt application, but the master prompt describes implementing a comprehensive workflow automation platform. 

**Proposed Resolution**: Proceed with Phase C RAG implementation as an additive enhancement to the existing prompt coach, treating it as a foundation for the larger workflow platform.

## Next Steps
1. Implement RAG ingestion pipeline
2. Add embedding capabilities
3. Create augmented answer node functionality
4. Maintain existing prompt coach functionality