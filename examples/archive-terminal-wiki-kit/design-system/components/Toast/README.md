# Toast

Toasts and the loading guide: small panels at the bottom-left with an accent, success or danger edge, and a sweeping bar while something loads; plus skeleton lines.

## Provide

Message text, kind (loading, ok, error), and whether it closes itself.

## Use

Confirmations (link copied, theme switched), errors, and the first-visit loading guide.

## States

- Enter by sliding 12px in from the left over `dur-drawer`; ok and loading are `role="status"`, errors `role="alert"`.
- Each toast has a 关闭 button; confirmations close after about two seconds.
- Skeleton lines sweep a `panel` highlight across `panel-muted` every `dur-pulse`.

## Don't

- Do not stack more than three toasts.
- Do not put the only copy of important information in a toast.
