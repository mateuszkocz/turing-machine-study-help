import {
  calculateResult,
  computeNextStates,
  createAction,
  createConfiguration,
  createMachine,
  printTape,
  last,
  print,
  right,
  computeFullCycle,
  complete,
  erase,
  left,
  schwa,
  anyOf,
  none,
  any,
  printTapeWithCursor,
} from "./machine"
it("computes a simple number from the sequence", () => {
  // Source: The Annotated Turing. 2008, p. 81
  const b = createConfiguration("b", [
    createAction(none(), [print("0"), right()], () => c),
  ])
  const c = createConfiguration("c", [createAction("", [right()], () => e)])
  const e = createConfiguration("e", [
    createAction(none(), [print("1"), right()], () => f),
  ])
  const f = createConfiguration("f", [createAction("", [right()], () => b)])
  const compute20nextStates = computeNextStates(20)
  const result = calculateResult(last(compute20nextStates(createMachine(b))))
  expect(result).toBe(42)
})
it("erases cells", () => {
  const e = createConfiguration("e", [
    createAction(none(), [print("1")], () => e),
    createAction("1", [right(), print("0")], () => e),
    createAction("0", [erase(), left(), erase()], () => complete),
  ])
  const result = calculateResult(last(computeFullCycle(createMachine(e))))
  expect(result).toBe(0)
})
it("supports multiple actions in the same config", () => {
  // Source: The Annotated Turing. 2008, p. 84
  const b = createConfiguration("b", [
    createAction(none(), [print("0")], () => b),
    createAction("0", [right(), right(), print("1")], () => b),
    createAction("1", [right(), right(), print("0")], () => b),
  ])
  const compute20nextStates = computeNextStates(20)
  const result = calculateResult(last(compute20nextStates(createMachine(b))))
  expect(result).toBe(42)
})
it("handles both numbers and non-numbers", () => {
  // Source: The Annotated Turing. 2008, p. 87
  const b = createConfiguration("b", [
    createAction(
      none(),
      [
        print(schwa()),
        right(),
        print(schwa()),
        right(),
        print("0"),
        right(),
        right(),
        print("0"),
        left(),
        left(),
      ],
      () => o
    ),
  ])
  const o = createConfiguration("o", [
    createAction("1", [right(), print("x"), left(), left(), left()], () => o),
    createAction("0", [], () => q),
  ])
  const q = createConfiguration("q", [
    createAction(anyOf("0", "1"), [right(), right()], () => q),
    createAction(none(), [print("1"), left()], () => p),
  ])
  const p = createConfiguration("p", [
    createAction("x", [erase(), right()], () => q),
    createAction(schwa(), [right()], () => f),
    createAction(none(), [left(), left()], () => p),
  ])
  const f = createConfiguration("f", [
    createAction(any(), [right(), right()], () => f),
    createAction(none(), [print("0"), left(), left()], () => o),
  ])
  const computeSomeNextStates = computeNextStates(1020)
  const result = printTape(last(computeSomeNextStates(createMachine(b))))
  expect(result).toBe(
    "əə0_0_1_0_1_1_0_1_1_1_0_1_1_1_1_0_1_1_1_1_1_0_1_1_1_1_1_1_0_1_1_1_1_1_1"
  )
})
