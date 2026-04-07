#!/bin/bash
# Helper functions for running commands with clean output
# Only shows full output on failure; on success shows a one-line summary.

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=${VERBOSE:-0}

# Run command silently, show output only on failure
run_silent() {
    local description="$1"
    local command="$2"

    if [ "$VERBOSE" = "1" ]; then
        echo "  → Running: $command"
        eval "$command"
        return $?
    fi

    local tmp_file=$(mktemp)
    if eval "$command" > "$tmp_file" 2>&1; then
        printf "  ${GREEN}✓${NC} %s\n" "$description"
        rm -f "$tmp_file"
        return 0
    else
        local exit_code=$?
        printf "  ${RED}✗${NC} %s\n" "$description"
        printf "${RED}Command failed: %s${NC}\n" "$command"
        cat "$tmp_file"
        rm -f "$tmp_file"
        return $exit_code
    fi
}

# Run test command, show summary on success, full output on failure
run_silent_with_test_count() {
    local description="$1"
    local command="$2"
    local test_type="${3:-vitest}"

    if [ "$VERBOSE" = "1" ]; then
        echo "  → Running: $command"
        eval "$command"
        return $?
    fi

    local tmp_file=$(mktemp)
    if eval "$command" > "$tmp_file" 2>&1; then
        local test_count=""
        case "$test_type" in
            vitest)
                test_count=$(grep -E "Tests.*passed" "$tmp_file" | grep -oE "[0-9]+ passed" | head -1)
                if [ -n "$test_count" ]; then
                    printf "  ${GREEN}✓${NC} %s (%s)\n" "$description" "$test_count"
                else
                    printf "  ${GREEN}✓${NC} %s\n" "$description"
                fi
                ;;
            playwright)
                test_count=$(grep -oE "[0-9]+ passed" "$tmp_file" | head -1)
                if [ -n "$test_count" ]; then
                    printf "  ${GREEN}✓${NC} %s (%s)\n" "$description" "$test_count"
                else
                    printf "  ${GREEN}✓${NC} %s\n" "$description"
                fi
                ;;
            *)
                printf "  ${GREEN}✓${NC} %s\n" "$description"
                ;;
        esac
        rm -f "$tmp_file"
        return 0
    else
        local exit_code=$?
        printf "  ${RED}✗${NC} %s\n" "$description"
        printf "${RED}Command failed: %s${NC}\n" "$command"
        cat "$tmp_file"
        rm -f "$tmp_file"
        return $exit_code
    fi
}

print_main_header() {
    local title="$1"
    printf "\n=== %s ===\n\n" "$title"
}
