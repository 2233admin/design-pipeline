# Breadcrumbs

Breadcrumbs and the page head: a home icon and slash-separated trail, the page title, a toolbar of tool buttons, and an edit-meta line, closed by a `rule-strong` line.

## Provide

The trail, the title, the toolbar actions and the last edit (time, editor, summary).

## Use

Every inner page, at the top of the main column.

## States

- Trail in 12px `ink-subtle` with 0.1em tracking; the current item in `ink`.
- Toolbar: tool buttons; Watch is a toggle (`aria-pressed`); Edit without rights is `aria-disabled` with a reason in its title.
- Meta line: time in `mono`, summary in italic `ink-subtle`.

## Don't

- Do not repeat the page title in the last crumb's link.
- Do not hide the toolbar on phones; it wraps.
