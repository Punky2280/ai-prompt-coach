# Copilot Instructions for Cartrita Unified Workflow Automation Platform

// CREATED_AUTOMATICALLY // VERIFY_OWNER_APPROVAL

## Overview
This repository is being transformed from an AI Prompt Coach into a unified workflow automation platform (Cartrita) that provides n8n + Zapier + MCP + RAG parity capabilities.

## Master Prompt Reference
This document references the master implementation prompt that defines:
- Phased delivery roadmap (A through F)
- Core schema and domain models
- Node taxonomy and execution engine
- Expression/template engine requirements
- Connector and plugin registry
- RAG module integration
- MCP integration capabilities
- Security and governance requirements

## Implementation Guidelines
- Follow spec-first, additive-only approach
- Maintain forward-only schema evolution
- API responses: {success:boolean, data?:any, error?:string}
- Redact secrets always
- Instrument DB operations with tracing spans
- Use feature gating for RAG, MCP, Marketplace
- No circular dependencies; dynamic loading for plugins

## Current Phase
Phase B: Parallelism, branching, retries, loops, subworkflows (basic), dry runs

## Conflict Resolution
Any conflicts between this document and the master prompt should be resolved in favor of the master prompt specifications.