# Agent Workspace Directory

This directory contains agent workspace configurations and custom agent implementations.

## Structure

- Each subdirectory represents a separate agent workspace
- Agent configurations can be stored as:
  - `config.json` - Agent configuration
  - `agent.json` - Agent metadata and settings
  - `claude.json` - Claude-specific configuration
  - `README.md` - Agent documentation

## Path Migration

This directory replaces the old `/prod/.claude/agent_workspace` location.

All agents are now located under:
- `/prod/claude/agents/` - Markdown-based agent definitions
- `/prod/claude/agent_workspace/` - Complex agent workspaces with configurations