import { describe, it, expect } from "vitest";
import { mergeEventLists } from "./mergeEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("mergeEventLists", () => {
  it("returns incoming events when existing list is empty", () => {
    const incoming = [createEvent({ id: "a" }), createEvent({ id: "b" })];

    const result = mergeEventLists([], incoming);

    expect(result).toEqual(incoming);
  });

  it("returns existing events when incoming list is empty", () => {
    const existing = [createEvent({ id: "a" }), createEvent({ id: "b" })];

    const result = mergeEventLists(existing, []);

    expect(result).toEqual(existing);
  });

  it("appends new events to existing events", () => {
    const existing = [createEvent({ id: "a", title: "Existing" })];
    const incoming = [createEvent({ id: "b", title: "New" })];

    const result = mergeEventLists(existing, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Existing");
    expect(result[1].title).toBe("New");
  });

  it("replaces existing event when incoming has matching id", () => {
    const existing = [createEvent({ id: "a", title: "Old" })];
    const incoming = [createEvent({ id: "a", title: "Updated" })];

    const result = mergeEventLists(existing, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Updated");
  });

  it("handles mix of new and updated events", () => {
    const existing = [createEvent({ id: "a", title: "Keep" }), createEvent({ id: "b", title: "Old" })];
    const incoming = [createEvent({ id: "b", title: "Updated" }), createEvent({ id: "c", title: "New" })];

    const result = mergeEventLists(existing, incoming);

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.title)).toEqual(["Keep", "Updated", "New"]);
  });

  it("does not mutate the input arrays", () => {
    const existing = [createEvent({ id: "a" })];
    const incoming = [createEvent({ id: "b" })];
    const existingCopy = [...existing];
    const incomingCopy = [...incoming];

    mergeEventLists(existing, incoming);

    expect(existing).toEqual(existingCopy);
    expect(incoming).toEqual(incomingCopy);
  });
});
