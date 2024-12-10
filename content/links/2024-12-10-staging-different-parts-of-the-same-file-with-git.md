+++
date = "2024-12-10T17:42:32.402767941Z"
publishDate = "2024-12-10T17:42:32.402767941Z"
title = "Staging different parts of the same file with Git"
originalUrl = "https://www.tempertemper.net/blog/staging-different-parts-of-the-same-file-with-git"
comment = "```\ny - stage this hunk\nn - do not stage this hunk\nq - quit; do not stage this hunk or any of the remaining ones\na - stage this hunk and all later hunks in the file\nd - do not stage this hunk or any of the later hunks in the file\ng - select a hunk to go to\n/ - search for a hunk matching the given regex\nj - leave this hunk undecided, see next undecided hunk\nJ - leave this hunk undecided, see next hunk\nk - leave this hunk undecided, see previous undecided hunk\nK - leave this hunk undecided, see previous hunk\ns - split the current hunk into smaller hunks\ne - manually edit the current hunk\n? - print help\n```\n\nWorkflow example:\n```\ngit reset HEAD~2\ngit add --patch # y, n, s, e, ...\ngit comit -m ''\ngit stash\n.... test\ngit stash pop\ngit add --patch\n```"
+++

### My thoughts

```
y - stage this hunk
n - do not stage this hunk
q - quit; do not stage this hunk or any of the remaining ones
a - stage this hunk and all later hunks in the file
d - do not stage this hunk or any of the later hunks in the file
g - select a hunk to go to
/ - search for a hunk matching the given regex
j - leave this hunk undecided, see next undecided hunk
J - leave this hunk undecided, see next hunk
k - leave this hunk undecided, see previous undecided hunk
K - leave this hunk undecided, see previous hunk
s - split the current hunk into smaller hunks
e - manually edit the current hunk
? - print help
```

Workflow example:
```
git reset HEAD~2
git add --patch # y, n, s, e, ...
git comit -m ''
git stash
.... test
git stash pop
git add --patch
```

Read the article: [Staging different parts of the same file with Git](https://www.tempertemper.net/blog/staging-different-parts-of-the-same-file-with-git)
