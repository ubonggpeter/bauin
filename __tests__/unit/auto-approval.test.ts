import { evalCondition } from "@/lib/server/auto-approval";

// ── helpers ───────────────────────────────────────────────────────
const cond = (operator: string, value: string) => ({ field: "x", operator, value });
const data = (x: unknown) => ({ x });

describe("evalCondition — numeric operators", () => {
  describe("gt (>)", () => {
    it("returns true when field > value", () => expect(evalCondition(cond("gt", "3"), data(5))).toBe(true));
    it("returns false when field === value", () => expect(evalCondition(cond("gt", "5"), data(5))).toBe(false));
    it("returns false when field < value", () => expect(evalCondition(cond("gt", "10"), data(5))).toBe(false));
  });

  describe("gte (>=)", () => {
    it("returns true when field > value", () => expect(evalCondition(cond("gte", "3"), data(5))).toBe(true));
    it("returns true when field === value", () => expect(evalCondition(cond("gte", "5"), data(5))).toBe(true));
    it("returns false when field < value", () => expect(evalCondition(cond("gte", "10"), data(5))).toBe(false));
  });

  describe("lt (<)", () => {
    it("returns true when field < value", () => expect(evalCondition(cond("lt", "10"), data(5))).toBe(true));
    it("returns false when field === value", () => expect(evalCondition(cond("lt", "5"), data(5))).toBe(false));
    it("returns false when field > value", () => expect(evalCondition(cond("lt", "3"), data(5))).toBe(false));
  });

  describe("lte (<=)", () => {
    it("returns true when field < value", () => expect(evalCondition(cond("lte", "10"), data(5))).toBe(true));
    it("returns true when field === value", () => expect(evalCondition(cond("lte", "5"), data(5))).toBe(true));
    it("returns false when field > value", () => expect(evalCondition(cond("lte", "3"), data(5))).toBe(false));
  });

  it("treats missing field as 0 for numeric comparison", () => {
    expect(evalCondition(cond("gt", "-1"), {})).toBe(true);
    expect(evalCondition(cond("lt", "1"),  {})).toBe(true);
  });
});

describe("evalCondition — string operators", () => {
  describe("eq", () => {
    it("matches equal strings", () => expect(evalCondition(cond("eq", "hello"), data("hello"))).toBe(true));
    it("is case-insensitive", () => expect(evalCondition(cond("eq", "HELLO"), data("hello"))).toBe(true));
    it("fails on mismatch", () => expect(evalCondition(cond("eq", "hello"), data("world"))).toBe(false));
  });

  describe("neq", () => {
    it("returns true when values differ", () => expect(evalCondition(cond("neq", "world"), data("hello"))).toBe(true));
    it("returns false when values match", () => expect(evalCondition(cond("neq", "hello"), data("hello"))).toBe(false));
  });

  describe("contains", () => {
    it("returns true when field includes value", () => expect(evalCondition(cond("contains", "world"), data("hello world"))).toBe(true));
    it("is case-insensitive", () => expect(evalCondition(cond("contains", "WORLD"), data("hello world"))).toBe(true));
    it("returns false when absent", () => expect(evalCondition(cond("contains", "foo"), data("hello world"))).toBe(false));
  });

  describe("not_contains", () => {
    it("returns true when field does not include value", () => expect(evalCondition(cond("not_contains", "foo"), data("hello world"))).toBe(true));
    it("returns false when field includes value", () => expect(evalCondition(cond("not_contains", "world"), data("hello world"))).toBe(false));
  });

  describe("min_length", () => {
    it("returns true when string length >= min", () => expect(evalCondition(cond("min_length", "3"), data("hello"))).toBe(true));
    it("returns true at exact min length", () => expect(evalCondition(cond("min_length", "5"), data("hello"))).toBe(true));
    it("returns false when string length < min", () => expect(evalCondition(cond("min_length", "6"), data("hello"))).toBe(false));
  });

  describe("max_length", () => {
    it("returns true when string length <= max", () => expect(evalCondition(cond("max_length", "10"), data("hello"))).toBe(true));
    it("returns true at exact max length", () => expect(evalCondition(cond("max_length", "5"), data("hello"))).toBe(true));
    it("returns false when string exceeds max", () => expect(evalCondition(cond("max_length", "4"), data("hello"))).toBe(false));
  });
});

describe("evalCondition — unknown operator", () => {
  it("returns true (allow-by-default) for unrecognised operators", () => {
    expect(evalCondition(cond("unknown_op", "anything"), data("value"))).toBe(true);
  });
});
