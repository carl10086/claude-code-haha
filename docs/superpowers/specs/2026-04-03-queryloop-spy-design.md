# Queryloop Spy Design

## Goal
Create a single-file spike outside the existing TTY/Ink entrypoints that proves we can drive the real agent core from plain script input.

The spike must:
- avoid modifying existing core code
- avoid TTY, Ink, and REPL rendering
- reuse the existing `processUserInput()` -> `query()` -> `queryLoop()` path
- live in a new standalone file, tentatively `debug/queryloop-spy.ts`

## Scope
This is a feasibility spike, not a production tool.

It only needs to prove that:
- a plain string input can be transformed into agent messages through `processUserInput()`
- when `shouldQuery` is true, the script can enter `query()` and consume events from `queryLoop()`

It does not need to support:
- full TUI behavior
- multi-turn persistence
- rich CLI UX
- broad slash-command compatibility
- long-term abstraction or framework code

## Architecture
The spike is a thin external driver around existing code.

Flow:

1. Prepare a fixed or easily editable input string inside the script.
2. Build the minimum `ProcessUserInputContext` required by `processUserInput()`.
3. Call `processUserInput()` with the input.
4. Print the returned `messages`, `shouldQuery`, and related metadata.
5. If `shouldQuery` is `true`, build minimal `QueryParams`.
6. Call `query()` and print each yielded event to stdout.

This preserves the real logic boundary:

`input string` -> `processUserInput()` -> `messages` -> `query()` -> `queryLoop()`

## Integration Boundaries
The spike should directly reuse:
- `src/utils/processUserInput/processUserInput.ts`
- `src/query.ts`
- existing prompt/system-context builders where practical
- existing tool assembly where practical

The spike may stub or no-op:
- UI-only callbacks such as `setToolJSX`
- prompt-display callbacks such as `setUserInputOnProcessing`
- notification-only callbacks
- REPL-only state management that does not affect the core query path

The spike must not:
- reimplement `queryLoop`
- fork or copy core agent logic
- modify existing REPL/TUI files to make the spike work

## File Layout
First version uses one file only:

- `debug/queryloop-spy.ts`

No helper modules are required for the initial spike. If the spike proves viable, later work can split formatting or context assembly into separate files.

## Data Flow
The spike simulates the non-TTY portion of a user turn:

1. User text enters the script.
2. `processUserInput()` converts that text into normalized messages and query intent.
3. The spike decides whether to continue based on `shouldQuery`.
4. `query()` receives the produced messages plus minimal system, user, tool, and permission context.
5. `queryLoop()` executes and yields stream or message events.
6. The spike prints those events directly for inspection and debugging.

## Error Handling
The spike should fail loudly and early.

Expected handling:
- if context construction is incomplete, surface the thrown error directly
- if `processUserInput()` returns `shouldQuery=false`, print the result and stop cleanly
- if `query()` throws, print the exception and preserve the stack trace

No retry or recovery behavior is required in the spike.

## Validation
The spike is successful in two stages.

### Stage 1
- script runs
- `processUserInput()` returns successfully

### Stage 2
- `shouldQuery` is `true`
- `query()` starts producing events

Stage 2 is the real success condition because it proves entry into the actual agent loop without the TTY shell.

## Risks
- the minimum `ProcessUserInputContext` may still depend on more REPL state than expected
- `ToolUseContext` assembly may reveal hidden coupling to REPL setup
- some slash-command or hook paths may be too UI-coupled for the first spike

These are acceptable risks because the spike is explicitly for feasibility testing.

## Recommendation
Proceed with the single-file spike first.

Do not generalize early. The only question the first version should answer is whether a plain script can drive the real `processUserInput()` to `queryLoop()` path without TTY involvement.
