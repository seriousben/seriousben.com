+++
date = "2026-02-17T01:46:02.789006004Z"
publishDate = "2026-02-17T01:46:02.789006004Z"
title = "Claude code skill creator skill"
originalUrl = "https://github.com/j-r-beckett/SpeedReader/blob/main/.claude/skills/skill-creator/SKILL.md"
comment = "colonCapitalDee on HN https://news.ycombinator.com/item?id=47041192:\n\n> I have a custom skill-creator skill that contains this:\n>\n> A common pitfall is for Claude to create skills and fill them up with generated information about how to complete a task. The problem with this is that the generated content is all content that's already inside Claude's probability space. Claude is effectively telling itself information that it already knows!\n>\n> Instead, Claude should strive to document in SKILL.md only information that:\n>\n> 1. Is outside of Claude's training data (information that Claude had to learn through research, experimentation, or experience) > 2. Is context specific (something that Claude knows now, but won't know later after its context window is cleared) > 3. Aligns future Claude with current Claude (information that will guide future Claude in acting how we want it to act)\n>\n> Claude should also avoid recording derived data. Lead a horse to water, don't teach it how to drink. If there's an easily available source that will tell Claude all it needs to know, point Claude at that source. If the information Claude needs can be trivially derived from information Claude already knows or has already been provided, don't provide the derived data.\n>\n> For those interested the full skill is here: https://github.com/j-r-beckett/Spe"
+++

### My thoughts

colonCapitalDee on HN https://news.ycombinator.com/item?id=47041192:

> I have a custom skill-creator skill that contains this:
>
> A common pitfall is for Claude to create skills and fill them up with generated information about how to complete a task. The problem with this is that the generated content is all content that's already inside Claude's probability space. Claude is effectively telling itself information that it already knows!
>
> Instead, Claude should strive to document in SKILL.md only information that:
>
> 1. Is outside of Claude's training data (information that Claude had to learn through research, experimentation, or experience) > 2. Is context specific (something that Claude knows now, but won't know later after its context window is cleared) > 3. Aligns future Claude with current Claude (information that will guide future Claude in acting how we want it to act)
>
> Claude should also avoid recording derived data. Lead a horse to water, don't teach it how to drink. If there's an easily available source that will tell Claude all it needs to know, point Claude at that source. If the information Claude needs can be trivially derived from information Claude already knows or has already been provided, don't provide the derived data.
>
> For those interested the full skill is here: https://github.com/j-r-beckett/Spe

Read the article: [Claude code skill creator skill](https://github.com/j-r-beckett/SpeedReader/blob/main/.claude/skills/skill-creator/SKILL.md)
