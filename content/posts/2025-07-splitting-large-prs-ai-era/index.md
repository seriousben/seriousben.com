---
title: "Being Nice to Reviewers: Splitting Large PRs in the AI Era"
date: 2025-07-29T10:00:00-04:00
toc: true
---

> **Note**: This post was written with the assistance of an LLM (Claude), which seemed fitting given the topic. The ideas, experiences, and approach described are my own, but AI helped structure the writing and generate the example script—much like how AI can help us split large PRs while human judgment guides the strategy.

AI tools are making us incredibly productive at writing code. They are also making our pull requests massive. What used to be a 5-file feature now easily becomes 30+ files spanning database migrations, API endpoints, frontend components, tests, and configuration changes. This increased productivity is amazing, but it has created a new problem: we are overwhelming our reviewers.

This problem is already being felt across the industry. As one developer noted in a [recent Hacker News discussion](https://news.ycombinator.com/item?id=38372972), "Large pull requests slow down development" because developers end up having to "babysit their PRs morning, evening, and night" just to maintain velocity. The community is recognizing that [AI code assistants "pour gasoline on the PR backlog fire"](https://graphite.dev/blog/how-ai-code-review-reduces-review-cycles) by creating huge changesets that overwhelm reviewers.

This is not just about making reviews faster—it is about [changing code empathically](../2020-05-changing-code-empathically/). In that post, I wrote about optimizing for happiness and being considerate to your teammates. Large PRs are the opposite of empathic code changes. They dump cognitive load onto reviewers, make meaningful feedback nearly impossible, and turn code review from a collaborative conversation into a rubber-stamping exercise.

## The Empathy Problem

In "Changing Code Empathically," I argued that we should optimize for the people who will read, review, and maintain our code. Large PRs violate this principle completely. Reviewers cannot hold 40+ files in their head at once—the cognitive overload is immense. When faced with massive changes, they start skimming instead of engaging deeply with the actual logic and design decisions. The story of your change gets buried in noise, and review fatigue sets in. Large PRs make reviewers want to just approve and move on rather than provide thoughtful feedback.

Research shows that ["code review fatigue is a real phenomenon"](https://www.swarmia.com/blog/why-small-pull-requests-are-better/) where reviewers start "skimming code, leaving fewer comments, and ending up with superficial 'LGTM' reviews." The result is reduced code quality and missed issues that could have been caught with more thorough reviews.

AI-based review tools like [CodeRabbit](https://www.coderabbit.ai/) and others are helping tremendously by catching syntax errors, style issues, and even tricky bugs that humans might miss—like race conditions, memory leaks, or subtle logic errors. These tools are amazing at handling the mechanical aspects of code review—the "how" of implementation details. But they don't replace human reviewers; they make human reviews more effective by allowing reviewers to focus on the "what"—the strategic decisions, architectural choices, and business logic that actually matter.

However, AI reviewers fundamentally lack what human teammates bring most to the table: strategic thinking. Does this change move us toward our product goals? Will it actually solve the problem our users face? These tools can tell you if your function is well-tested, but they cannot tell you if you are building the right thing. They miss the bigger picture of how changes fit with long-term technical direction and business objectives.


With AI helping us write more code faster, this problem is only getting worse. As noted in discussions about [AI code reviews](https://www.greptile.com/blog/ai-code-reviews-conflict), "AI has reduced the average quality of the code that good engineers write" partly because "engineers underestimate" the need to carefully review AI-generated code. Even with AI review assistants, we need new strategies for being nice to our human reviewers in the AI era.

## A Recent Example: The Notification System

Last month, I found myself staring at a feature branch with 38 changed files. I had been working on a notification system for our application, and with AI assistance, I had implemented everything from database migrations to React components to comprehensive test coverage.

The feature worked perfectly. All tests passed. But as I was about to create the PR, I imagined my teammate trying to review it. They would have to understand the database schema changes, follow the API implementation, review React component logic, verify test coverage, check type definitions, and validate configuration changes. All in one massive review session. 

This is not being nice to your teammates.

## Why Large PRs Hurt Everyone

Large PRs hurt more than just reviewers. They hurt the entire team:

### For Reviewers
When reviewers see a PR with 30+ files, their brains essentially shut down. The cognitive overload is real—human working memory just cannot handle that much context switching. What happens instead? Shallow reviews where important issues get missed and feedback becomes generic. Many reviewers admit that large PRs feel intimidating, so they procrastinate or rush through them just to get them off their plate.

As one [Stack Overflow discussion](https://softwareengineering.stackexchange.com/questions/381343/how-to-make-better-code-reviews-when-pull-requests-are-large) notes: "Reviewing large pull requests with hundreds of lines of code can overwhelm even the most experienced developers."

### For Incidents
When something breaks and you need to track down the cause, large PRs become a nightmare. You are staring at a changeset that touches database schemas, API endpoints, frontend components, and configuration files all at once. Where do you even start? The blast radius is huge—one small bug buried in a large PR can take down multiple systems. And if you need to roll back? You lose all the good changes along with the problematic ones.

### For Code History
Six months later, when you are debugging an issue, git blame shows you a massive commit that changed 40 files at once. Good luck figuring out why that particular line was modified or what the developer was thinking. The story of how a feature evolved gets compressed into one giant commit message. Large PRs also create more merge conflicts since they touch so many files that other developers might be working on simultaneously.

The Hacker News community has recognized this pattern, with developers noting that some workplaces ["would straight up reject a PR if it was too big and demand it be broken out into smaller logical pieces"](https://news.ycombinator.com/item?id=38372972) to maintain code quality and review effectiveness.

## The Empathic Solution: File-Based PR Splitting

The solution is not to stop using AI tools—it is to develop better practices for organizing our changes. I have started splitting large features into logical PR chains. Each PR tells a clear story focused on one aspect of the feature. They build on each other in a dependency chain that makes sense. Most importantly, each PR can be reviewed, tested, and deployed independently while respecting the cognitive limits of human reviewers.

## Practical Guide: Using AI to Split Your Large PR

Rather than manually figuring out how to split a large PR (which is time-consuming and error-prone), you can use an LLM like Claude to help you create an automated splitting script. Here is the step-by-step process I used:

### Step 1: Safety First - Push and Backup

Before doing anything, protect your work:

```bash
# Push your feature branch to remote
git push origin feature/notification-system

# Create a backup in a separate directory
cp -r /path/to/your/project /path/to/backup/project-backup-$(date +%Y%m%d)
```

### Step 2: Analyze Your Changes with AI

Start by asking your AI assistant to help analyze what you have:

**Prompt 1: Initial Analysis**
```
I have a large feature branch with many files. Help me understand what files have changed:

Can you help me run `git diff --name-only main..HEAD` and analyze the types of files I'm working with?
```

**Prompt 2: Categorization**
```
Now help me categorize these files into logical groups for separate PRs. I'm working on a [describe your feature]. What would be a good way to split this into 3-4 logical PRs that build on each other?
```

### Step 3: Create the Automation Script

Once you have a plan, ask the AI to create the automation:

**Prompt 3: Script Generation**
```
Create a bash script to split this feature branch into logical PRs with proper git commands, commit messages referencing [your ticket number], and GitHub CLI commands to create the PRs with dependencies.

Make it so the script:
- Creates branches from the appropriate base branches
- Cherry-picks specific files using `git checkout feature-branch -- file1 file2`
- Validates each PR with [your build/test commands]
- Creates PRs with proper dependency chains
```

**Prompt 4: File Verification**
```
Can you double check that all files are present in the script? I want to make sure we don't miss any files from the original feature branch.

Compare the files in my feature branch with what's included in the script sections.
```

### Step 4: Test and Validate

**Prompt 5: Final Verification**
```
Now help me verify the script is correct:
1. Check that all [X] files from my feature branch are accounted for
2. Make sure the dependency chain makes sense
3. Verify the commit messages follow good practices

Also, can you suggest how to test this safely before running it on my real branch?
```

### Example AI Conversation Flow

Here is what this looked like in practice when I was splitting my notification system:

```
Me: "I have a feature branch with 38 files for a notification system. Help me split this into logical PRs."

AI: "Let me analyze your files... I see database migrations, API endpoints, React components, and tests. I'd suggest 4 PRs:
1. Database foundation
2. Backend services  
3. Frontend components
4. Tests and configuration"

Me: "Create a bash script that does this automatically with validation."

AI: [Generated the complete script]

Me: "Double-check that all 38 files are included in the script."

AI: "I found 1 missing file: src/components/__tests__/NotificationBell.test.tsx - it should go in PR4"
```

### The Result: A Custom Splitting Script

After this AI-assisted process, you'll have a script like this one for our notification system:

```bash
#!/bin/bash

# Notification System PR Splitter
# Generated by AI to split a 38-file feature into logical PRs
# Usage: ./split-notification-feature.sh [target-repo-directory] [--pr-only]

set -euo pipefail

# Configuration - customize these for your project
FEATURE_BRANCH="feature/notification-system"
MAIN_BRANCH="main"
ISSUE_KEY="FEAT-1234"
BRANCH_PREFIX="feature"

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validation function - ensures each PR can build independently
validate_branch() {
    local branch_name="$1"
    log_info "Validating: $branch_name"
    
    # Run your project's validation commands
    npm run build || { log_error "Build failed"; return 1; }
    npm run lint || { log_error "Lint failed"; return 1; }
    npm test || { log_error "Tests failed"; return 1; }
    
    log_success "Validation passed: $branch_name"
}

# Parse arguments
TARGET_DIR="${1:-$(pwd)}"
PR_ONLY=false

# Check for --pr-only flag (skip branch creation if branches exist)
for arg in "$@"; do
    case $arg in
        --pr-only) PR_ONLY=true; shift ;;
    esac
done

cd "$TARGET_DIR"
log_info "Working in: $(pwd)"

# Safety checks - verify we have what we need
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) required but not installed"
    exit 1
fi

if [ ! -f "package.json" ]; then
    log_error "package.json not found - is this a Node.js project?"
    exit 1
fi

# Define our PR structure - AI determined these logical groupings
PR1_BRANCH="$BRANCH_PREFIX/notifications-database"
PR2_BRANCH="$BRANCH_PREFIX/notifications-backend" 
PR3_BRANCH="$BRANCH_PREFIX/notifications-frontend"
PR4_BRANCH="$BRANCH_PREFIX/notifications-tests"

if [ "$PR_ONLY" = false ]; then
    log_info "=== Creating branches ==="

    # PR 1: Database Foundation (6 files)
    # Why: Database schema must exist before any code can use it
    log_info "Creating: $PR1_BRANCH"
    git checkout "$MAIN_BRANCH"
    git checkout -b "$PR1_BRANCH"

    git checkout "$FEATURE_BRANCH" -- \
        prisma/* \
        src/types/notification.ts \
        package.json \
        package-lock.json \
        tsconfig.json

    # Always run dependency management after file changes
    npm install
    git add .
    git commit -m "feat($ISSUE_KEY): add notification database schema

- Add Prisma schema for notifications table
- Create database migration for notification system
- Add TypeScript types for notification entities
- Foundation for notification feature implementation

$ISSUE_KEY"

    validate_branch "$PR1_BRANCH"
    git push -u origin "$PR1_BRANCH"
    log_success "Created: $PR1_BRANCH"

    # PR 2: Backend Services (12 files) 
    # Why: API layer depends on database schema and types
    log_info "Creating: $PR2_BRANCH"
    git checkout "$PR1_BRANCH"  # Build on PR1, not main
    git checkout -b "$PR2_BRANCH"

    git checkout "$FEATURE_BRANCH" -- \
        src/api/* \
        src/services/* \
        src/middleware/* \
        src/utils/* \
        src/config/* \
        src/types/api.ts \
        package.json \
        package-lock.json

    npm install
    git add .
    git commit -m "feat($ISSUE_KEY): implement notification API and services

- Add REST API endpoints for notifications CRUD
- Implement notification service with business logic
- Add email service integration for notification delivery
- Include authentication middleware for secure access
- Add validation utilities for notification data

$ISSUE_KEY"

    validate_branch "$PR2_BRANCH"
    git push -u origin "$PR2_BRANCH"
    log_success "Created: $PR2_BRANCH"

    # PR 3: Frontend Components (14 files)
    # Why: UI components depend on API types and endpoints
    log_info "Creating: $PR3_BRANCH"
    git checkout "$PR2_BRANCH"  # Build on PR2
    git checkout -b "$PR3_BRANCH"

    git checkout "$FEATURE_BRANCH" -- \
        src/components/* \
        src/hooks/* \
        src/pages/* \
        src/styles/* \
        src/contexts/* \
        src/types/components.ts \
        package.json \
        package-lock.json

    npm install
    git add .
    git commit -m "feat($ISSUE_KEY): add notification UI components and pages

- Add NotificationList and NotificationItem components
- Implement NotificationBell with real-time updates
- Create custom hooks for notification state management
- Add NotificationsPage for full notification management
- Include responsive styling and accessibility features

$ISSUE_KEY"

    validate_branch "$PR3_BRANCH"
    git push -u origin "$PR3_BRANCH"
    log_success "Created: $PR3_BRANCH"

    # PR 4: Tests & Configuration (6 files)
    # Why: Tests validate the complete integrated system
    log_info "Creating: $PR4_BRANCH"
    git checkout "$PR3_BRANCH"  # Build on PR3
    git checkout -b "$PR4_BRANCH"

    git checkout "$FEATURE_BRANCH" -- \
        src/**/__tests__/* \
        jest.config.js \
        .github/workflows/*

    npm install
    git add .
    git commit -m "feat($ISSUE_KEY): add comprehensive test coverage and CI updates

- Add API endpoint tests with mocked dependencies
- Include service layer unit tests with edge cases
- Add React component tests with user interactions
- Include custom hook tests for state management
- Update CI workflow to test notification features

$ISSUE_KEY"

    validate_branch "$PR4_BRANCH"
    git push -u origin "$PR4_BRANCH"
    log_success "Created: $PR4_BRANCH"

    log_success "All branches created and validated!"
else
    log_info "=== PR-only mode: Verifying branches exist ==="
    
    # Verify all branches exist before creating PRs
    for branch in "$PR1_BRANCH" "$PR2_BRANCH" "$PR3_BRANCH" "$PR4_BRANCH"; do
        if ! git show-ref --verify --quiet refs/heads/$branch; then
            log_error "Branch '$branch' does not exist. Run without --pr-only first."
            exit 1
        fi
        log_info "✓ Branch exists: $branch"
    done
    
    log_success "All branches verified!"
fi

# Create PRs with proper dependency chain
log_info "=== Creating GitHub PRs ==="

# PR1 -> main (foundation)
gh pr create \
    --title "feat($ISSUE_KEY): add notification database schema" \
    --body "## Summary
- Database foundation for notification system
- Prisma schema and migration files
- TypeScript type definitions

## Testing
- All builds, lints, and tests pass
- Database migration tested locally

## Next Steps
This PR establishes the data layer foundation. The API implementation will follow.

Relates to $ISSUE_KEY" \
    --base "$MAIN_BRANCH" \
    --head "$PR1_BRANCH"

# PR2 -> PR1 (depends on database)
gh pr create \
    --title "feat($ISSUE_KEY): implement notification API and services" \
    --body "## Summary
- REST API endpoints for notification CRUD operations
- Business logic in service layer with email integration
- Authentication and validation middleware

## Dependencies
⚠️ **Depends on database schema PR** - merge that first

## Testing
- All API endpoints tested with integration tests
- Service layer has comprehensive unit test coverage

## Next Steps
UI components will be built on top of this API layer.

Relates to $ISSUE_KEY" \
    --base "$PR1_BRANCH" \
    --head "$PR2_BRANCH"

# PR3 -> PR2 (depends on API)
gh pr create \
    --title "feat($ISSUE_KEY): add notification UI components and pages" \
    --body "## Summary
- React components for notification display and management
- Custom hooks for state management and real-time updates
- Responsive design with accessibility considerations

## Dependencies
⚠️ **Depends on API implementation PR** - merge that first

## Testing
- Component tests with user interaction scenarios
- Hook tests for state management edge cases

## Next Steps
Final testing and CI integration will complete the feature.

Relates to $ISSUE_KEY" \
    --base "$PR2_BRANCH" \
    --head "$PR3_BRANCH"

# PR4 -> PR3 (depends on full feature)
gh pr create \
    --title "feat($ISSUE_KEY): add comprehensive test coverage and CI updates" \
    --body "## Summary
- Integration tests for complete notification workflow
- Enhanced CI pipeline for notification feature validation
- Edge case coverage and error handling tests

## Dependencies
⚠️ **Depends on UI implementation PR** - merge that first

## Testing
- Full end-to-end test coverage
- CI pipeline validates all notification functionality

## Completion
This completes the notification system implementation with full test coverage.

Relates to $ISSUE_KEY" \
    --base "$PR3_BRANCH" \
    --head "$PR4_BRANCH"

log_success "All PRs created!"
log_info "Merge order: PR1 → PR2 → PR3 → PR4"
log_info "Each PR builds on the previous one and can be reviewed independently."
```

The script that AI generates will:
- Handle your specific project structure and build commands
- Include all your files in logical, dependency-aware groups  
- Validate each PR independently before moving to the next
- Create PRs with clear descriptions and dependency documentation
- Be reusable for future large features

## The Notification System: A Complete Example

Here is how I split that 38-file notification system:

### PR1: Database Foundation (6 files)
```
prisma/*
src/types/notification.ts
package.json
package-lock.json
tsconfig.json
```

**Story**: "Establish the data foundation for notifications"
**Review focus**: Schema design, data relationships, type safety

### PR2: Backend Services (12 files)
```
src/api/*
src/services/*
src/middleware/*
src/utils/*
src/config/*
src/types/api.ts
```

**Story**: "Implement notification business logic and API"
**Review focus**: API design, business rules, error handling

### PR3: Frontend Components (14 files)
```
src/components/*
src/hooks/*
src/pages/*
src/styles/*
src/contexts/*
src/types/components.ts
```

**Story**: "Add notification UI and user interactions"
**Review focus**: UX, accessibility, state management

### PR4: Tests & Configuration (6 files)
```
src/**/__tests__/*
jest.config.js
.github/workflows/*
```

**Story**: "Ensure comprehensive test coverage"
**Review focus**: Test quality, edge cases, configuration

## Benefits of Empathic PR Splitting

This approach transformed the review experience. Each PR now has a clear, narrow focus—instead of 38 files, reviewers handle 6-14 files and can follow the feature's evolution step by step. Research supports this: ["Small pull requests speed up the feedback cycle"](https://www.swarmia.com/blog/why-small-pull-requests-are-better/) and ensure "earlier discussion about the chosen solution and better design decisions."

The quality of feedback improved dramatically. Reviewers can actually understand each change and provide feedback on real design decisions rather than just surface issues. PRs become collaborative discussions instead of rubber stamps.

Deployments became safer too. You can revert individual pieces without losing everything—smaller changes mean smaller blast radius. When debugging later, git blame tells a much clearer story about what was changed and why.

Most importantly, git history now shows how the feature developed naturally. Each commit has a focused purpose, and six months later, the reasoning behind decisions is still clear.

As one developer noted in the [Hacker News discussion](https://news.ycombinator.com/item?id=38372972): mixing multiple types of changes in one PR "slows things down, and hides potential problems by covering the intended modification in the fog of the other changes."

## Future Improvements & Advanced Techniques

File-level splitting is just the beginning. There are more advanced techniques for creating truly empathic code changes:

### Line-Level Splitting
Sometimes a single file contains multiple types of changes. Git's patch mode lets you split even further:

```bash
# Split changes within a file
git add --patch src/components/UserProfile.tsx

# This lets you create separate commits for:
# - Formatting/style changes
# - Bug fixes  
# - New features
# even within the same file
```

### Semantic Commits
Break changes into logical commits that tell a story:

```bash
# Instead of one big commit:
git commit -m "Add user profile feature"

# Create a series of focused commits:
git commit -m "refactor: extract user validation logic"
git commit -m "feat: add user profile component" 
git commit -m "test: add profile component tests"
git commit -m "docs: update user management README"
```

### Exercise for Readers
Try this with your next feature: Take a file that has both business logic changes and formatting updates. Use `git add --patch` to split them into separate commits within the same PR. You'll be surprised how much clearer the change becomes.

### Advanced Tooling
Several tools can make this process even smoother. Git-absorb automatically creates fixup commits for changes. Interactive rebase helps you reorganize commits to tell better stories. Git hooks can automatically validate PR size and suggest splits when you push large changesets. Some emerging tools even use AI to analyze your changes and suggest logical file groupings.

The perfect split is more art than science, but starting with file-level organization gets you 80% of the way there.

## Conclusion

In the AI era, our ability to generate code is outpacing our ability to review it thoughtfully. The solution is not to slow down our productivity—it is to develop more empathic practices for organizing our changes. The irony is perfect: we can use AI to help us fix the problems that AI created.

Splitting large PRs is about more than just making reviews faster. It is about respecting your teammates' time and cognitive capacity. It is about creating code that tells a story. It is about optimizing for the humans who will read, review, and maintain your work.

As I wrote in "Changing Code Empathically": optimize for happiness. What I have discovered is that with AI assistance, this "extra effort" to split PRs actually becomes quite manageable. The prompts I have shared above can help you create a custom splitting script in about 20 minutes—a small investment that pays dividends in team happiness.

The next time AI helps you build a feature that touches 30+ files, do not despair about the size. Instead, paste the file list into your favorite AI assistant and ask it to help you split it up. Use the prompts from this post as a starting point. Ask it to analyze your changed files and categorize them. Ask it to create a script to split this into logical PRs. Ask it to double-check that all files are accounted for. Ask it to add validation and error handling.

Your reviewers will thank you, your git history will be clearer, and your incidents will be easier to debug. Most importantly, you will be treating your teammates with the empathy they deserve.

Being nice to reviewers is being nice to your teammates—and AI can help us do that better than ever before.