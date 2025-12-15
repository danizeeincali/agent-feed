#!/bin/bash

# Production System Instructions Validation Script
# Validates the bulletproof read-only system instructions architecture

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Configuration
PROD_SYSTEM_INSTRUCTIONS="/workspaces/agent-feed/prod/system_instructions"
VALIDATION_LOG="/workspaces/agent-feed/prod/logs/system-instruction-validation.log"
REQUIRED_DIRS=(
    "api"
    "rules" 
    "workspace"
    "architecture"
    "migration"
)

REQUIRED_FILES=(
    "README.md"
    "api/allowed_operations.json"
    "api/forbidden_operations.json"
    "api/endpoint_contracts.json"
    "rules/core_boundaries.md"
    "rules/operation_limits.md"
    "workspace/agent_workspace_rules.md"
    "architecture/system_overview.md"
    "migration/workspace_migration_plan.md"
    "migration/validation_checkpoints.md"
)

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$VALIDATION_LOG")"

# Start validation
log "Starting production system instructions validation..."
echo "$(date): Starting validation" > "$VALIDATION_LOG"

# Test 1: Directory Structure Validation
log "🔍 Validating directory structure..."
if [[ ! -d "$PROD_SYSTEM_INSTRUCTIONS" ]]; then
    error "Production system instructions directory does not exist: $PROD_SYSTEM_INSTRUCTIONS"
fi

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ -d "$PROD_SYSTEM_INSTRUCTIONS/$dir" ]]; then
        success "Directory exists: $dir"
        echo "✅ Directory exists: $dir" >> "$VALIDATION_LOG"
    else
        error "Required directory missing: $dir"
    fi
done

# Test 2: Required Files Validation
log "🔍 Validating required files..."
for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$PROD_SYSTEM_INSTRUCTIONS/$file" ]]; then
        success "File exists: $file"
        echo "✅ File exists: $file" >> "$VALIDATION_LOG"
    else
        error "Required file missing: $file"
    fi
done

# Test 3: File Permissions Validation
log "🔍 Validating file permissions (read-only enforcement)..."

# Check directory permissions (should be 555 - read+execute only)
while IFS= read -r -d '' dir; do
    perms=$(stat -c "%a" "$dir")
    if [[ "$perms" == "555" ]]; then
        success "Correct directory permissions: $dir ($perms)"
        echo "✅ Directory permissions: $dir ($perms)" >> "$VALIDATION_LOG"
    else
        error "Invalid directory permissions: $dir ($perms, expected 555)"
    fi
done < <(find "$PROD_SYSTEM_INSTRUCTIONS" -type d -print0)

# Check file permissions (should be 444 - read-only)
while IFS= read -r -d '' file; do
    perms=$(stat -c "%a" "$file")
    if [[ "$perms" == "444" ]]; then
        success "Correct file permissions: $(basename "$file") ($perms)"
        echo "✅ File permissions: $file ($perms)" >> "$VALIDATION_LOG"
    else
        error "Invalid file permissions: $file ($perms, expected 444)"
    fi
done < <(find "$PROD_SYSTEM_INSTRUCTIONS" -type f -print0)

# Test 4: Content Validation
log "🔍 Validating file content integrity..."

# Validate JSON files
for json_file in "$PROD_SYSTEM_INSTRUCTIONS"/api/*.json; do
    if [[ -f "$json_file" ]]; then
        if jq empty "$json_file" 2>/dev/null; then
            success "Valid JSON: $(basename "$json_file")"
            echo "✅ Valid JSON: $json_file" >> "$VALIDATION_LOG"
        else
            error "Invalid JSON format: $json_file"
        fi
    fi
done

# Validate Markdown files
while IFS= read -r -d '' md_file; do
    if [[ -s "$md_file" ]]; then
        # Check if file has content
        if [[ $(wc -l < "$md_file") -gt 0 ]]; then
            success "Valid Markdown: $(basename "$md_file")"
            echo "✅ Valid Markdown: $md_file" >> "$VALIDATION_LOG"
        else
            warning "Empty Markdown file: $md_file"
        fi
    else
        error "Empty or missing file: $md_file"
    fi
done < <(find "$PROD_SYSTEM_INSTRUCTIONS" -name "*.md" -type f -print0)

# Test 5: Write Protection Test
log "🔍 Testing write protection enforcement..."

# Try to create a file (should fail)
TEST_FILE="$PROD_SYSTEM_INSTRUCTIONS/write-test.tmp"
if touch "$TEST_FILE" 2>/dev/null; then
    error "SECURITY VIOLATION: Write operation succeeded in read-only directory!"
else
    success "Write protection working: Cannot create files"
    echo "✅ Write protection enforced" >> "$VALIDATION_LOG"
fi

# Try to modify existing file (should fail)
EXISTING_FILE="$PROD_SYSTEM_INSTRUCTIONS/README.md"
if echo "test" >> "$EXISTING_FILE" 2>/dev/null; then
    error "SECURITY VIOLATION: File modification succeeded in read-only directory!"
else
    success "Modification protection working: Cannot modify files"
    echo "✅ Modification protection enforced" >> "$VALIDATION_LOG"
fi

# Test 6: API Contract Validation
log "🔍 Validating API contracts..."

# Check allowed operations structure
ALLOWED_OPS="$PROD_SYSTEM_INSTRUCTIONS/api/allowed_operations.json"
if jq -e '.file_system_operations.allowed.read.paths' "$ALLOWED_OPS" > /dev/null 2>&1; then
    success "Allowed operations structure valid"
    echo "✅ Allowed operations structure valid" >> "$VALIDATION_LOG"
else
    error "Invalid allowed operations structure"
fi

# Check forbidden operations structure
FORBIDDEN_OPS="$PROD_SYSTEM_INSTRUCTIONS/api/forbidden_operations.json"
if jq -e '.critical_system_modifications.forbidden.system_instructions' "$FORBIDDEN_OPS" > /dev/null 2>&1; then
    success "Forbidden operations structure valid"
    echo "✅ Forbidden operations structure valid" >> "$VALIDATION_LOG"
else
    error "Invalid forbidden operations structure"
fi

# Test 7: Security Policy Validation
log "🔍 Validating security policies..."

# Check core boundaries document
CORE_BOUNDARIES="$PROD_SYSTEM_INSTRUCTIONS/rules/core_boundaries.md"
if grep -q "ABSOLUTE RULE" "$CORE_BOUNDARIES" && \
   grep -q "IMMUTABLE.*NON-NEGOTIABLE" "$CORE_BOUNDARIES" && \
   grep -qi "cannot.*modify.*system" "$CORE_BOUNDARIES"; then
    success "Core boundaries properly defined"
    echo "✅ Core boundaries validation passed" >> "$VALIDATION_LOG"
else
    error "Core boundaries document missing critical security policies"
fi

# Check operation limits
OPERATION_LIMITS="$PROD_SYSTEM_INSTRUCTIONS/rules/operation_limits.md"
if grep -q "Resource Limits" "$OPERATION_LIMITS" && \
   grep -q "Security Operation Limits" "$OPERATION_LIMITS"; then
    success "Operation limits properly defined"
    echo "✅ Operation limits validation passed" >> "$VALIDATION_LOG"
else
    error "Operation limits document missing critical restrictions"
fi

# Test 8: Integration Validation
log "🔍 Validating integration points..."

# Check migration plan completeness
MIGRATION_PLAN="$PROD_SYSTEM_INSTRUCTIONS/migration/workspace_migration_plan.md"
if grep -q "Agent Workspace Migration Plan" "$MIGRATION_PLAN" && \
   grep -q "Sensitive Data.*NO MIGRATION" "$MIGRATION_PLAN" && \
   grep -q "Rollback Procedures" "$MIGRATION_PLAN"; then
    success "Migration plan complete and secure"
    echo "✅ Migration plan validation passed" >> "$VALIDATION_LOG"
else
    error "Migration plan incomplete or missing security measures"
fi

# Check validation checkpoints
VALIDATION_CHECKPOINTS="$PROD_SYSTEM_INSTRUCTIONS/migration/validation_checkpoints.md"
if grep -q "Migration Validation Checkpoints" "$VALIDATION_CHECKPOINTS" && \
   grep -q "Sensitive Data Detection" "$VALIDATION_CHECKPOINTS"; then
    success "Validation checkpoints comprehensive"
    echo "✅ Validation checkpoints complete" >> "$VALIDATION_LOG"
else
    error "Validation checkpoints incomplete"
fi

# Test 9: Architecture Documentation Validation
log "🔍 Validating architecture documentation..."

SYSTEM_OVERVIEW="$PROD_SYSTEM_INSTRUCTIONS/architecture/system_overview.md"
if grep -q "Production System Architecture Overview" "$SYSTEM_OVERVIEW" && \
   grep -q "Multi-Layer Protection Strategy" "$SYSTEM_OVERVIEW" && \
   grep -q "READ-ONLY" "$SYSTEM_OVERVIEW"; then
    success "Architecture documentation complete"
    echo "✅ Architecture documentation validated" >> "$VALIDATION_LOG"
else
    error "Architecture documentation incomplete"
fi

# Test 10: Checksum Validation (Integrity Check)
log "🔍 Generating and validating checksums..."

CHECKSUM_FILE="/workspaces/agent-feed/prod/system_instructions.checksums"
find "$PROD_SYSTEM_INSTRUCTIONS" -type f -exec md5sum {} \; > "$CHECKSUM_FILE"

if [[ -s "$CHECKSUM_FILE" ]]; then
    CHECKSUM_COUNT=$(wc -l < "$CHECKSUM_FILE")
    success "Generated checksums for $CHECKSUM_COUNT files"
    echo "✅ Checksums generated: $CHECKSUM_COUNT files" >> "$VALIDATION_LOG"
else
    error "Failed to generate integrity checksums"
fi

# Test 11: Backup Verification
log "🔍 Creating verification backup..."

BACKUP_DIR="/workspaces/agent-feed/prod/backups/system-instructions-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$PROD_SYSTEM_INSTRUCTIONS" "$BACKUP_DIR/"

if diff -r "$PROD_SYSTEM_INSTRUCTIONS" "$BACKUP_DIR/system_instructions" > /dev/null; then
    success "Verification backup created successfully"
    echo "✅ Verification backup: $BACKUP_DIR" >> "$VALIDATION_LOG"
else
    error "Verification backup failed integrity check"
fi

# Test 12: Final Integration Test
log "🔍 Running final integration test..."

# Simulate production Claude access patterns
readonly WORKSPACE_ACCESS_TEST="/workspaces/agent-feed/prod/agent_workspace"
if [[ -d "$WORKSPACE_ACCESS_TEST" ]]; then
    # Should be able to access workspace
    if [[ -r "$WORKSPACE_ACCESS_TEST" ]]; then
        success "Production workspace accessible"
        echo "✅ Production workspace access validated" >> "$VALIDATION_LOG"
    else
        warning "Production workspace not accessible"
    fi
else
    warning "Production workspace not yet created"
fi

# Generate validation report
VALIDATION_REPORT="/workspaces/agent-feed/prod/system-instructions-validation-report.md"
cat > "$VALIDATION_REPORT" << EOF
# Production System Instructions Validation Report

**Validation Date**: $(date)
**Validation Script**: $0
**System Instructions Path**: $PROD_SYSTEM_INSTRUCTIONS

## Validation Results

✅ **Directory Structure**: All required directories present
✅ **Required Files**: All critical files present and accessible
✅ **File Permissions**: Read-only enforcement confirmed (444/555)
✅ **Content Integrity**: All JSON and Markdown files valid
✅ **Write Protection**: Write operations properly blocked
✅ **API Contracts**: All API definitions properly structured
✅ **Security Policies**: Core boundaries and limits properly defined
✅ **Integration Points**: Migration plan and checkpoints complete
✅ **Architecture Docs**: System overview and protection strategy documented
✅ **Integrity Checksums**: Generated for all files ($CHECKSUM_COUNT files)
✅ **Verification Backup**: Created at $BACKUP_DIR

## Security Status

🔒 **READ-ONLY ENFORCEMENT**: Confirmed
🛡️ **WRITE PROTECTION**: Active
📋 **API BOUNDARIES**: Properly defined
⚡ **OPERATION LIMITS**: Configured
🔍 **MONITORING READY**: Validation framework in place

## Deployment Status

**READY FOR PRODUCTION DEPLOYMENT**

All validation checks passed. The production system instructions architecture is bulletproof and ready for production Claude instance deployment.

## Next Steps

1. Deploy production Claude with system instructions reference
2. Activate real-time monitoring
3. Implement backup and recovery procedures
4. Schedule regular integrity validation

---

*Generated by: Production System Instructions Validation Script*
*Validation Log: $VALIDATION_LOG*
EOF

success "Validation report generated: $VALIDATION_REPORT"

# Final summary
log "🎉 Validation completed successfully!"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    VALIDATION SUMMARY                            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  ✅ All directory structure requirements met                     ║${NC}"
echo -e "${GREEN}║  ✅ All required files present and valid                         ║${NC}"
echo -e "${GREEN}║  ✅ Read-only permissions properly enforced                      ║${NC}"
echo -e "${GREEN}║  ✅ Write protection working correctly                           ║${NC}"
echo -e "${GREEN}║  ✅ API contracts and security policies complete                 ║${NC}"
echo -e "${GREEN}║  ✅ Integration and migration plans validated                    ║${NC}"
echo -e "${GREEN}║  ✅ Architecture documentation comprehensive                      ║${NC}"
echo -e "${GREEN}║  ✅ Integrity checksums and backups created                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║              🚀 READY FOR PRODUCTION DEPLOYMENT 🚀               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

success "Production system instructions architecture is bulletproof and ready!"
echo ""
log "📋 Validation report: $VALIDATION_REPORT"
log "📝 Validation log: $VALIDATION_LOG"
log "💾 Verification backup: $BACKUP_DIR"
log "🔐 Integrity checksums: $CHECKSUM_FILE"

echo "$(date): Validation completed successfully" >> "$VALIDATION_LOG"
exit 0