---
title: "Patch Coverage"
date: 2022-02-12T00:00:00-00:00
draft: false
tags: ["golang"]
description: ""
---

Code Coverage as a way to track code quality has existed for as long as code
exists. For that same amount of time, different schools of thought have debated
on how best to leverage coverage to help drive quality.  For example, the
concept of [Modified condition/decision
coverage](https://en.wikipedia.org/wiki/Modified_condition/decision_coverage)
which defines a criterion used in avionics, in automotive, and in lots of
safety-critical systems has been referred to in standards [created in
1992](https://en.wikipedia.org/wiki/DO-178B).

But this post is not exploring the philosophical aspects of code coverage. It
is about one metric we get with coverage: patch code coverage.
We'll explore what it is and how it can be used to write better code, how it
can be determined, and we'll have an extensive example of how it can be
implemented for go programs and integrated with Github Actions.

When changing code, you typically have two coverage data points: the project
coverage before and the one after a change. There is another datapoint that is
often forgotten, the coverage of the changed code. The patch coverage.

Patch coverage makes it easy to understand whether you've merely improved
coverage of existing code or have added coverage for the new code. Afterall, It
is possible to increase coverage of a project without adding any tests to new
or changed files in one patch.

Let's dig deeper in figuring out how to answer: "How much of the new
code I am introducing is covered by tests?".

## Everyday Usage

Patch Coverage is already part of our day to day life. Your code editor is most
likely allowing you to look at code coverage as you work on new code and tests.

For example:

- Goland [https://www.jetbrains.com/help/go/code-coverage.html](https://www.jetbrains.com/help/go/code-coverage.html)
- Vim-go [https://github.com/fatih/vim-go/wiki/Tutorial#cover-it](https://github.com/fatih/vim-go/wiki/Tutorial#cover-it)
- VS Code [https://github.com/golang/vscode-go/blob/master/docs/features.md#code-coverage](https://github.com/golang/vscode-go/blob/master/docs/features.md#code-coverage)

{{< figure src="/posts/2022-02-patch-coverage/vscode-coverage.png" alt="VS Code Golang Coverage" caption="Figure 1: VS Code Patch Coverage" class="large-figure" >}}

These tools are amazing at providing you quick coverage data feedback as you write tests to
let you know what needs more coverage.

If you are not that capability in all features you are working on, I highly
suggest turning it on to accelerate writing meaningful tests.

But what about getting the actual coverage number for the new and changed
lines of your patch? That number is super useful to convey changed file
coverage on pull-request or, depending on your testing philosophy, as a policy
enforcement check (for example: All code changes require at least 90%
coverage). That number is also very actionable for engineers working in that
area of the code. It is numbers about the code they changed or added after all.
So making those numbers visible automatically provides the team with a feedback loop
making them consider the test coverage of their new code.

## Implementation

The implementation of patch coverage is relatively simple. It requires mapping
coverage data to the patch diff in order to only keep any coverage data for lines
that have changed.

{{< figure src="/posts/2022-02-patch-coverage/patch-coverage-formula.png" alt="Patch Coverage Formula: Coverage Data + Patch = Patch Coverage" caption="Figure 1: Patch Coverage Formula" class="large-figure" >}}

Since coverage data is different for each programming language
, we will be focusing on the [Go Programming Language](https://golang.org/) to look at
implementing patch coverage. We'll be going through the details behind
[go-patch-cover](https://github.com/seriousben/go-patch-cover). I created
[go-patch-cover](https://github.com/seriousben/go-patch-cover) to provide code authors and reviewers
the tool necessary to understand the coverage of changed code without the use
of a third party coverage tool.

To implement go patch coverage we need two input files:

1. The coverage data of the whole code base.
2. The patch data itself to identify what lines were added or changed.

### Coverage Data: Go Coverage Profile

Let's understand the go coverage data format. Commonly named coverage profile.

The first line of a coverage profile contains the mode:

```
mode: <type>
```

Where type can be "set", "count", or "atomic".

The rest of the file looks like this:

```
encoding/base64/base64.go:34.44,37.40 3 1
```

Which follows a specific format:

```
name.go:line.column,line.column numberOfStatements count
```

Full example:

```
mode: set
github.com/seriousben/go-patch-cover/cover.go:11.72,13.16 2 1
github.com/seriousben/go-patch-cover/cover.go:19.2,20.16 2 1
github.com/seriousben/go-patch-cover/cover.go:24.2,25.16 2 1
github.com/seriousben/go-patch-cover/cover.go:29.2,29.41 1 1
github.com/seriousben/go-patch-cover/cover.go:13.16,15.3 1 0
github.com/seriousben/go-patch-cover/cover.go:20.16,22.3 1 0
github.com/seriousben/go-patch-cover/cover.go:25.16,27.3 1 0
github.com/seriousben/go-patch-cover/cover.go:41.103,44.34 2 1
github.com/seriousben/go-patch-cover/cover.go:77.2,77.34 1 1
github.com/seriousben/go-patch-cover/cover.go:86.2,86.23 1 1
github.com/seriousben/go-patch-cover/cover.go:89.2,89.28 1 1
github.com/seriousben/go-patch-cover/cover.go:93.2,93.18 1 1
github.com/seriousben/go-patch-cover/cover.go:44.34,45.31 1 1
github.com/seriousben/go-patch-cover/cover.go:45.31,47.49 1 1
github.com/seriousben/go-patch-cover/cover.go:52.3,53.31 1 1
github.com/seriousben/go-patch-cover/cover.go:47.49,49.13 1 1
github.com/seriousben/go-patch-cover/cover.go:53.31,56.39 2 1
github.com/seriousben/go-patch-cover/cover.go:56.39,57.35 1 1
github.com/seriousben/go-patch-cover/cover.go:57.35,58.35 1 1
github.com/seriousben/go-patch-cover/cover.go:61.7,65.57 2 1
github.com/seriousben/go-patch-cover/cover.go:58.35,59.16 1 0
github.com/seriousben/go-patch-cover/cover.go:65.57,68.26 2 1
github.com/seriousben/go-patch-cover/cover.go:77.34,78.30 1 1
github.com/seriousben/go-patch-cover/cover.go:78.30,81.4 2 1
github.com/seriousben/go-patch-cover/cover.go:86.23,88.3 1 1
github.com/seriousben/go-patch-cover/cover.go:89.28,91.3 1 1
```

#### Interpretation

Getting coverage information from a profile is straightforward.

First, we need to understand the difference in modes:

* Set: set to 1 when the the statements are covered
* Count: count the number of times the statements ran
* Atomic: Like count but accurately when dealing with parallelism / goroutine

Second, we maintain two counters: a total number of statements, and number of covered
statements. For each profile block, add the number of the statement blocks to
the number of total statements. If the block has a count greater than zero
(zero being not covered and greater means covered) add the number of the
statement blocks to the number of covered statements.

And lastly, we compute the coverage by taking the number of covered statements divided by the
total number of statements.

This could be summarized with this pseudocode:

```go
total_num_statements = 0
num_covered_statements = 0

for each profiles as profile:
    for each profile.blocks as block:
        total_num_statements += block.num_statements
        if block.count > 0:
            num_covered_statements += block.num_statements

# elegant tip from the go tools code to prevent division by zero.
if total_num_statements == 0:
    total_num_statements = 1

coverage = num_covered_statements / total_num_statements * 100
```

### The Patch: Unified Diff

The patch itself will be a [unified diff](https://www.gnu.org/software/diffutils/manual/diffutils.html#Detailed-Unified)
file.

Each file changed in the patch has its own section in the
unified diff file which is composed of:

* Header for the file
  - ```
    diff --git a/cmd/main.go b/cmd/main.go
    new file mode 100644
    index 0000000..e6deb13
    --- /dev/null
    +++ b/cmd/main.go
    ```
* Hunks for each change section

Each Hunk is composed of:

* Header for the hunk, line start and end
  - ```
    @@ -1 +1 @@
    ```
* Context lines: Code that has not changed to faciliate reviewing. Number of context is typically configurable.
* Changed lines prefixed with + or - for addition or deletion
  - ```
    @@ -1 +1 @@
    -package main
    +package patchcover
    @@ -4,2 +3,0 @@ import (
    -	"fmt"
    -	"log"
    ```

**Complete Example (without context lines):**

Generated using `git diff -U0`.

```diff
diff --git a/cmd/main.go b/cmd/main.go
new file mode 100644
index 0000000..e6deb13
--- /dev/null
+++ b/cmd/main.go
@@ -0,0 +1,18 @@
+package main
+
+import (
+	"fmt"
+	"log"
+
+	patchcover "github.com/seriousben/go-patch-cover"
+)
+
+func main() {
+	coverage, err := patchcover.ProcessFiles("testdata/scenarios/new_file/diff.diff", "testdata/scenarios/new_file/coverage.out")
+	if err != nil {
+		log.Fatal(err)
+	}
+
+	fmt.Printf("coverage: %.1f%% of statements\n", coverage.Coverage)
+	fmt.Printf("patch coverage: %.1f%% of changed statements\n", coverage.PatchCoverage)
+}
diff --git a/main.go b/cover.go
similarity index 55%
rename from main.go
rename to cover.go
index 9a53c79..c07aadb 100644
--- a/main.go
+++ b/cover.go
@@ -1 +1 @@
-package main
+package patchcover
@@ -4,2 +3,0 @@ import (
-	"fmt"
-	"log"
@@ -13,2 +11,2 @@ import (
-func main() {
-	patch, err := os.Open("testdata/scenarios/new_file/diff.diff")
+func ProcessFiles(diffFile, coverageFile string) (CoverageData, error) {
+	patch, err := os.Open(diffFile)
@@ -16 +14 @@ func main() {
-		log.Fatal(err)
+		return CoverageData{}, err
@@ -23 +21 @@ func main() {
-		log.Fatal(err)
+		return CoverageData{}, err
@@ -26 +24 @@ func main() {
-	profiles, err := cover.ParseProfiles("testdata/scenarios/new_file/coverage.out")
+	profiles, err := cover.ParseProfiles(coverageFile)
@@ -28 +26 @@ func main() {
-		log.Fatal(err)
+		return CoverageData{}, err
@@ -31,6 +29,11 @@ func main() {
-	var (
-		numStmt         int
-		coverCount      int
-		patchNumStmt    int
-		patchCoverCount int
-	)
+	return computeCoverage(files, profiles)
+}
+
+type CoverageData struct {
+	NumStmt         int
+	CoverCount      int
+	Coverage        float64
+	PatchNumStmt    int
+	PatchCoverCount int
+	PatchCoverage   float64
+}
@@ -37,0 +41,2 @@ func main() {
+func computeCoverage(diffFiles []*gitdiff.File, coverProfiles []*cover.Profile) (CoverageData, error) {
+	var data CoverageData
@@ -39,2 +44,2 @@ func main() {
-	for _, p := range profiles {
-		for _, f := range files {
+	for _, p := range coverProfiles {
+		for _, f := range diffFiles {
@@ -50 +55 @@ func main() {
-				patchNumStmt += b.NumStmt
+				data.PatchNumStmt += b.NumStmt
@@ -62 +67 @@ func main() {
-							patchCoverCount += b.NumStmt * b.Count
+							data.PatchCoverCount += b.NumStmt * b.Count
@@ -72 +77 @@ func main() {
-	for _, p := range profiles {
+	for _, p := range coverProfiles {
@@ -74,2 +79,2 @@ func main() {
-			numStmt += b.NumStmt
-			coverCount += b.NumStmt * b.Count
+			data.NumStmt += b.NumStmt
+			data.CoverCount += b.NumStmt * b.Count
@@ -81,4 +86,2 @@ func main() {
-	if numStmt != 0 {
-		fmt.Printf("coverage: %.1f%% of statements\n", float64(coverCount)/float64(numStmt)*100)
-	} else {
-		fmt.Printf("coverage: %d%% of statements\n", 0)
+	if data.NumStmt != 0 {
+		data.Coverage = float64(data.CoverCount) / float64(data.NumStmt) * 100
@@ -86,4 +89,2 @@ func main() {
-	if patchNumStmt != 0 {
-		fmt.Printf("patch coverage: %.1f%% of changed statements\n", float64(patchCoverCount)/float64(patchNumStmt)*100)
-	} else {
-		fmt.Printf("patch coverage: %d%% of changed statements\n", 0)
+	if data.PatchNumStmt != 0 {
+		data.PatchCoverage = float64(data.PatchCoverCount) / float64(data.PatchNumStmt) * 100
@@ -90,0 +92,2 @@ func main() {
+
+	return data, nil
```

go-patch-cover uses https://github.com/bluekeyes/go-gitdiff to parse diff files.

### Mapping Coverage Profile to Unified Diff

From these two types of file, we can get the patch coverage number.

Patch coverage is simply finding the covered and total number of statements that
are contained within a changed section of a file.

This pseudocode explains some of the intricacies needed to do so:

```
# coverageOfBlock computes the num of covered and total statements of a coverage block
# if contained as an added line of the patched file.
func coverageOfBlock(coverage_block, file_patch) cover_count, total_count:
    for each hunks in file_patch.hunks:
        for each hunk_num, hunk_line in hunks:
            # For patch coverage, we only care about additions.
            if hunk_line !startsWith "+":
               continue

            # Each line within hunk increments the line number, this includes context lines.
            line_num = hunk.new_position + hunk_num

            # Check if patch line within the coverage block stand and end.
            if coverage_block.start_line <= line_num && line_num <= coverageBlock.end_line:
                total_count = coverage_block.num_statements
                cover_count = 0
                if coverage_block.count > 0:
                    cover_count = coverage_block.num_statements

                return cover_count, total_count
   return 0, 0

total_num_statements = 0
num_covered_statements = 0
for each profile in coverage_profiles:
    for each file_patch in patch:
        if file_patch.name != profile.file_name:
            continue
        for each block in profile.blocks:
           c, t = coverageOfBlock(block, file_patch.hunks)
           total_num_statements += t
           num_covered_statements += c

# elegant tip from the go tools code to prevent division by zero.
if total_num_statements == 0:
    total_num_statements = 1

patch_coverage = num_covered_statements / total_num_statements * 100
```

## go-patch-cover

[go-patch-cover](https://github.com/seriousben/go-patch-cover) is a tool I wrote to provide patch coverage for go. It also integrates with GitHub Actions via [go-patch-cover-action](https://github.com/seriousben/go-patch-cover-action).

```
> go-patch-cover coverage.out patch.diff

new coverage: 91.7% of statements
patch coverage: 96% of changed statements (48/50)

```

[go-patch-cover](https://github.com/seriousben/go-patch-cover) usage:

```
Usage: go-patch-cover [--version] [--help] [flags...] coverage_file diff_file [previous_coverage_file]

Arguments:

coverage_file
    go coverage file for the code after patch was applied.
    Can be generated with any cover mode.
    Example generation:
        go test -coverprofile=coverage.out -covermode=count ./...

diff_file
    unified diff file of the patch to compute coverage for.
    Example generation:
        git diff -U0 --no-color origin/${GITHUB_BASE_REF} > patch.diff

previous_coverage_file [OPTIONAL]
    go coverage file for the code before the patch was applied.
    When not provided, previous coverage information will not be displayed.

Flags:

--version
    display go-patch-cover version.

--help
    display this help message.

-o string
    output format: json, template; default: template.

-tmpl string
    go template string to override default template.

Examples:

Display total and patch coverage percentages to stdout:
    go-patch-cover coverage.out patch.diff

Display previous, total and patch coverage percentages to stdout:
    go-patch-cover coverage.out patch.diff prevcoverage.out

Display previous, total and patch coverage percentages as JSON to stdout:
    go-patch-cover -o json coverage.out patch.diff prevcoverage.out

Display patch coverage percentage to stdout by providing a custom template:
    go-patch-cover -tmpl "{{ .PatchCoverage }}" coverage.out patch.diff

```

### Using go-patch-cover with GitHub Actions

[go-patch-cover-action](https://github.com/seriousben/go-patch-cover-action) provies a GitHub Action
to keep track of the patch coverage or a pull request.

```yaml
name: "CI"

on: ["push", "pull_request"]

permissions:
  contents: write
  pull-requests: write

jobs:
  ci:
    name: "Run CI"
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: WillAbides/setup-go-faster@v1.7.0
      with:
        go-version: "*"
    - run: "go test -coverprofile=coverage.out -covermode=count ./..."
    - uses: seriousben/go-patch-cover-action@v1.0.0
      with:
        version: main
```

{{< figure src="/posts/2022-02-patch-coverage/go-patch-cover-action-example.png" alt="Github Action Example" caption="Figure 1: go-patch-cover-action example" class="large-figure" >}}

## Patch Coverage in third party tools

Patch Coverage is not new, some third party tools support it:
* [CodeCov's Patch coverage](https://docs.codecov.com/docs/commit-status#patch-status)
* [Code climate's Diff Coverage](https://docs.codeclimate.com/docs/configuring-your-analysis#test-coverage)

## Closing Words

Code Coverage is a tool in the software engineer's toolbox that should not be disregarded.
When used well, it can allow you to get quick feedback on your your code. Pariging it with
Patch Coverage allows teams to make local changes that slowly impact the quality of the
project as a whole.

Remember to approach testing with pragmatism. In a world where time to market and ability to pivot
are everything, 100% coverage is rarely a good idea. It is possible to leverage patch coverage to
ensure ever changing and high-risk code is well covered, while still focusing on flexibiity and
velocity.
