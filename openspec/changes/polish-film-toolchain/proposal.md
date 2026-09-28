# Polish the film toolchain

The film gates from `codify-product-film-gates` and `film-timeline-and-model-evals` work as
separate commands but leave a weaker agent to discover the order, capture the timeline by hand,
and infer how to repair each finding. A CLI audit also found contract errors that do not name
allowed values and help text that omits required flags.

Add `film scaffold`, `film capture-timeline` and `film check`; attach a concrete `fix` to every
film finding; make enum and property errors list allowed values; complete the CLI help for
status, foundation, evidence, verify and benchmark. No new package dependency.
