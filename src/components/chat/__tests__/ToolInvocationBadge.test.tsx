import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(overrides: Partial<ToolInvocation>): ToolInvocation {
  return {
    toolCallId: "call-1",
    toolName: "str_replace_editor",
    args: {},
    state: "result",
    result: "Success",
    ...overrides,
  } as ToolInvocation;
}

test("shows a friendly message when creating a file", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        args: { command: "create", path: "src/components/Card.tsx" },
      })}
    />
  );

  expect(screen.getByText("Creating src/components/Card.tsx")).toBeDefined();
});

test("shows a friendly message when editing a file via str_replace", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        args: { command: "str_replace", path: "src/App.tsx" },
      })}
    />
  );

  expect(screen.getByText("Editing src/App.tsx")).toBeDefined();
});

test("shows a friendly message when editing a file via insert", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        args: { command: "insert", path: "src/App.tsx" },
      })}
    />
  );

  expect(screen.getByText("Editing src/App.tsx")).toBeDefined();
});

test("shows a friendly message when viewing a file", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        args: { command: "view", path: "src/App.tsx" },
      })}
    />
  );

  expect(screen.getByText("Viewing src/App.tsx")).toBeDefined();
});

test("shows a friendly message when undoing an edit", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        args: { command: "undo_edit", path: "src/App.tsx" },
      })}
    />
  );

  expect(screen.getByText("Undoing last edit to src/App.tsx")).toBeDefined();
});

test("falls back to a generic file label when path is missing", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({ args: { command: "create" } })}
    />
  );

  expect(screen.getByText("Creating a file")).toBeDefined();
});

test("shows a friendly message when renaming a file", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "src/Old.tsx",
          new_path: "src/New.tsx",
        },
      })}
    />
  );

  expect(
    screen.getByText("Renaming src/Old.tsx to src/New.tsx")
  ).toBeDefined();
});

test("shows a friendly message when deleting a file", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "delete", path: "src/Unused.tsx" },
      })}
    />
  );

  expect(screen.getByText("Deleting src/Unused.tsx")).toBeDefined();
});

test("falls back to the raw tool name for unknown tools", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        toolName: "some_other_tool",
        args: {},
      })}
    />
  );

  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("shows a spinner while the tool call is in progress", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        state: "call",
        args: { command: "create", path: "src/App.tsx" },
        result: undefined,
      })}
    />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows a completed indicator once the tool call has a result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        state: "result",
        result: "Success",
        args: { command: "create", path: "src/App.tsx" },
      })}
    />
  );

  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("still shows a spinner if state is result but result is empty", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation({
        state: "result",
        result: "",
        args: { command: "create", path: "src/App.tsx" },
      })}
    />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
