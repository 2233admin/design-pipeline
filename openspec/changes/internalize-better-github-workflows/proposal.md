# Proposal

Internalize the useful read-only GitHub agent workflows from `better-github-skill`: one-shot PR
state, review conversations with resolved-thread state, and bounded CI failure drilldown.

The implementation stays project-owned and dependency-free. It does not copy or execute upstream
source, install a companion skill, create GitHub artifacts, or expand the design pipeline into a
general GitHub client.
