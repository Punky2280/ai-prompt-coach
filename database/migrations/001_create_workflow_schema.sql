-- PURPOSE: Core workflow automation schema for Cartrita platform
-- PHASE: B 
-- STATUS: complete
-- VERIFY: Database connection and migration system setup

-- Workflows table - stores workflow definitions
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL, -- workflow graph definition
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- user reference
    tags TEXT[]
);

-- Workflow runs - stores execution instances
CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    workflow_version INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trigger_type VARCHAR(50), -- manual, webhook, cron, api
    trigger_data JSONB,
    dry_run BOOLEAN DEFAULT FALSE,
    execution_context JSONB -- runtime context data
);

-- Node executions - tracks individual node runs within workflow
CREATE TABLE node_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL, -- node identifier in workflow definition
    node_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed, skipped
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 0,
    execution_order INTEGER, -- for tracking execution sequence
    parent_execution_id UUID REFERENCES node_executions(id), -- for subworkflows
    branch_condition JSONB, -- for conditional branching
    loop_iteration INTEGER DEFAULT 0 -- for loop tracking
);

-- Execution logs - detailed step-by-step logs
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_execution_id UUID REFERENCES node_executions(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'info', -- debug, info, warn, error
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connectors registry - available connectors and their versions
CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, deprecated, disabled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connector versions - version management for connectors
CREATE TABLE connector_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    definition JSONB NOT NULL, -- actions, triggers, auth config
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, deprecated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changelog TEXT,
    UNIQUE(connector_id, version)
);

-- Workflow triggers - defines how workflows can be triggered
CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL, -- webhook, cron, manual, api
    trigger_config JSONB NOT NULL, -- type-specific configuration
    status VARCHAR(50) DEFAULT 'active', -- active, paused, disabled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Performance and monitoring indexes
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_created_at ON workflow_runs(created_at DESC);
CREATE INDEX idx_node_executions_run_id ON node_executions(run_id);
CREATE INDEX idx_node_executions_status ON node_executions(status);
CREATE INDEX idx_execution_logs_run_id ON execution_logs(run_id);
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp DESC);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_connectors_slug ON connectors(slug);
CREATE INDEX idx_connector_versions_connector_id ON connector_versions(connector_id);
CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);