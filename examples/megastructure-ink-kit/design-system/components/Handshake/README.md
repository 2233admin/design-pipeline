# Handshake

The switchboard handshake: four steps (唤醒 / 握手 / 鉴权 / 接入), a message line and the actions.

## Provide

State (`idle`, `run`, `fail`) and the terminal it writes to.

## Use

On the switchboard screen. Without an echo key it always ends refused.

## States

- Run: step 2 has a `signal` top edge, the send button is busy.
- Fail: step 3 turns `alarm-dim` with an `alarm` edge, the message turns `alarm`.
- The echo-key button stays disabled.

## Don't

- Do not fake success: the refusal is the story.
