# SPARC Specification: Terminal Auto-Command Feature

## Objective
Update the SimpleLauncher terminal functionality to automatically execute commands when the terminal connects, progressing through three phases while maintaining all existing functionality.

## Requirements

### Phase 1: Auto "cd prod"
- Terminal automatically executes "cd prod" when connecting
- Command visible in terminal output
- User can continue typing after auto-command completes
- All existing terminal functionality preserved

### Phase 2: Auto "cd prod && claude"  
- Terminal automatically executes "cd prod && claude" when connecting
- Both commands execute sequentially
- Terminal remains interactive after claude launches
- All existing terminal functionality preserved

### Phase 3: Four Button Options
- Replace single "Launch Claude" button with 4 options:
  1. "prod/claude" - executes: cd prod && claude
  2. "prod/claude --dangerously-skip-permissions" - executes: cd prod && claude --dangerously-skip-permissions
  3. "prod/claude --dangerously-skip-permissions -c" - executes: cd prod && claude --dangerously-skip-permissions -c
  4. "prod/claude --dangerously-skip-permissions --resume" - executes: cd prod && claude --dangerously-skip-permissions --resume
- Each button launches terminal with its respective command
- All existing terminal functionality preserved

## Technical Constraints
- Must work with existing WebSocket architecture
- Must maintain compatibility with Terminal, TerminalFixed, and TerminalDiagnostic components
- Cannot break existing SimpleLauncher functionality
- Must be backward compatible
- Commands must execute after terminal connection established
- Terminal must remain interactive after auto-commands

## Implementation Points
1. Add `initialCommand` prop to terminal components
2. Emit command through WebSocket after connection
3. Ensure proper timing (wait for shell ready)
4. Update SimpleLauncher UI for Phase 3 buttons
5. Pass appropriate initialCommand based on button clicked

## Testing Requirements
- TDD approach with tests written before implementation
- Playwright integration tests for UI functionality
- Regression tests to ensure existing features work
- Unit tests for new props and command execution
- E2E tests for full workflow

## Success Criteria
- Auto-commands execute reliably on every connection
- Terminal remains fully interactive after commands
- No regressions in existing functionality
- All tests pass
- Clean, maintainable code following existing patterns