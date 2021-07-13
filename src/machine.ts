enum RunningState {
  Running,
  Paused,
  Completed,
}
interface Machine {
  runningState: RunningState
  currentCell: Cell
  currentConfiguration: Configuration
  operationsToPerform: Operation[] | undefined
  nextConfiguration: Configuration
}
interface Configuration {
  name: string
  actions: Action[]
}
type Symbol = string
interface Cell {
  value: Symbol
  left: Cell | undefined
  right: Cell | undefined
}
interface Action {
  forSymbol: Symbol | Set<Symbol>
  operations: Array<Operation>
  getFinalConfiguration: () => Configuration
}
interface Operation {
  name: string
  execute: (cell: Cell) => Cell
}
type OperationExecutor = (cell: Cell, ...parameters: string[]) => Cell
export const createOperation =
  (name: string, executor: OperationExecutor) =>
  (...parameters: string[]): Operation => ({
    name: name + padWithEmptyString(combineIfLength(parameters)),
    execute: (cell: Cell) => executor(cell, ...parameters),
  })
export const print = createOperation(
  "print",
  (cell: Cell, value: Symbol): Cell => {
    cell.value = value
    return cell
  }
)
export const erase = createOperation("erase", (cell: Cell): Cell => {
  cell.value = ""
  return cell
})
export const left = createOperation("left", (cell: Cell): Cell => {
  if (!cell.left) {
    const leftCell = createCell()
    leftCell.right = leftCell
    cell.left = leftCell
  }
  return cell.left
})
export const right = createOperation("right", (cell: Cell): Cell => {
  if (!cell.right) {
    const rightCell = createCell()
    rightCell.left = cell
    cell.right = rightCell
  }
  return cell.right
})
export const createConfiguration = (
  name: string,
  actions: Action[]
): Configuration => {
  return {
    name,
    actions,
  }
}
export const createAction = (
  forSymbol: Symbol | Set<Symbol>,
  operations: Operation[],
  getFinalConfiguration: () => Configuration
): Action => {
  return {
    forSymbol,
    operations,
    getFinalConfiguration,
  }
}
const anySymbolTag = "__any symbol __" as const
export const anyOf = (...symbols: Symbol[]) => new Set(symbols)
export const none = (): Symbol => ""
export const any = (): Symbol => anySymbolTag
export const schwa = (): Symbol => "ə"
export const complete = createConfiguration("complete", [])
export const createMachine = (initialConfiguration: Configuration): Machine => {
  return {
    runningState: RunningState.Paused,
    currentConfiguration: createConfiguration("begin", [
      createAction("", [], () => initialConfiguration),
    ]),
    operationsToPerform: undefined,
    currentCell: createCell(),
    nextConfiguration: initialConfiguration,
  }
}
const createCell = (): Cell => {
  return {
    value: "",
    left: undefined,
    right: undefined,
  }
}
const cloneCells = (cell: Cell): Cell => {
  // TODO this should clone the tape deeply.
  return cell
}
const findActionForSymbol = (
  configuration: Configuration,
  symbol: Symbol
): Action | undefined =>
  configuration.actions.find(({ forSymbol }) => {
    if (forSymbol === any() && symbol !== none()) {
      return true
    }
    return typeof forSymbol === "string"
      ? forSymbol === symbol
      : forSymbol.has(symbol)
  })
const computeNextMachine = (previousMachine: Machine): Machine => {
  const currentCell = cloneCells(previousMachine.currentCell)
  const currentSymbol = currentCell.value
  const currentConfiguration = previousMachine.operationsToPerform
    ? previousMachine.currentConfiguration
    : previousMachine.nextConfiguration
  let operations: Operation[]
  let nextConfiguration: Configuration
  if (previousMachine.operationsToPerform) {
    operations = previousMachine.operationsToPerform
    nextConfiguration = previousMachine.nextConfiguration
  } else {
    const currentAction = findActionForSymbol(
      currentConfiguration,
      currentSymbol
    )
    if (!currentAction) {
      return {
        ...previousMachine,
        runningState: RunningState.Completed,
      }
    }
    operations = currentAction.operations
    nextConfiguration = currentAction.getFinalConfiguration()
  }
  const [operation, ...remainingOperations] = operations
  // Some actions might not have any operation defined and just redirect to another configuration.
  // This is why operation is optional and—if that happens—just use the existing cell for the next computation.
  const nextCell = operation?.execute(currentCell) ?? currentCell
  const nextOperations = remainingOperations.length
    ? remainingOperations
    : undefined
  return {
    runningState: RunningState.Running,
    currentConfiguration,
    operationsToPerform: nextOperations,
    currentCell: nextCell,
    nextConfiguration,
  }
}
export const computeNextStates =
  (states: number) =>
  (machine: Machine): Machine[] => {
    const machines = [machine]
    for (let x = 0; x < states; x += 1) {
      machines.push(computeNextMachine(last(machines)))
    }
    return machines
  }
export const computeFullCycle = (machine: Machine): Machine[] => {
  const machines = [machine]
  do {
    machines.push(computeNextMachine(last(machines)))
  } while (last(machines).runningState !== RunningState.Completed)
  return machines
}
export const compose = <R>(fn1: (a: R) => R, ...fns: Array<(a: R) => R>) =>
  fns.reduce((prevFn, nextFn) => (value) => prevFn(nextFn(value)), fn1)
const map =
  <T, V>(how: (item: T) => V) =>
  (what: Array<T>) =>
    what.map(how)
const filter =
  <T>(how: (item: any) => item is T) =>
  (what: Array<unknown>): Array<T> =>
    what.filter(how)
const ifPredicateThenElse =
  (ifPredicate: (item: any) => boolean) =>
  <V>(thenThat: (value: any) => V, elseThat?: (value: any) => V) =>
  (value: any): V =>
    ifPredicate(value) ? thenThat(value) : elseThat?.(value) ?? value
const isEqual =
  <T>(to: T) =>
  (item: T) =>
    item === to
const get =
  <T, K extends keyof T = keyof T>(prop: K) =>
  (obj: T): T[K] =>
    obj[prop]
export const last = <T>(items: T[]): T => items[items.length - 1]
const join =
  <T>(withString: string) =>
  (items: Array<T>) =>
    items.join(withString)
const findLeftmostCell = (cell: Cell): Cell =>
  cell.left ? findLeftmostCell(cell.left) : cell
const tapeToArray = (fromCell: Cell, list: Cell[] = []): Cell[] => [
  fromCell,
  ...(fromCell.right ? tapeToArray(fromCell.right, list) : []),
]
const not =
  <T>(predicate: (item: T) => boolean) =>
  (item: T): boolean =>
    !predicate(item)
const or =
  (
    predicate1: (item: any) => boolean,
    predicate2: (item: any) => boolean
  ): ((item: any) => boolean) =>
  (item: any) =>
    predicate1(item) || predicate2(item)
const isEmptyString = isEqual("")
const isZero = isEqual(0)
const getArrayLength = get<Array<any>, "length">("length")
const hasLength = (array: any[]) => not(isZero)(getArrayLength(array)) // FIXME
const ifEqualEmptyStringThen = ifPredicateThenElse(isEmptyString)
const ifHasLength = ifPredicateThenElse(hasLength)
const getCurrentCell = get<Machine, "currentCell">("currentCell")
const cellArrayToValues = map((cell: Cell) => cell.value)
const isMachineCurrentCell: (machine: Machine) => boolean = compose(
  isEqual,
  getCurrentCell
)
const combineValuesToString = join("")
const combineValuesWithSpace = join(" ")
const isString1 = isEqual("1")
const isString0 = isEqual("0")
const isDigit = or(isString1, isString0) as (item: Symbol) => item is "0" | "1"
const onlyDigits = filter(isDigit)
const getFullCellsArray: (machine: Machine) => Cell[] = compose(
  tapeToArray,
  findLeftmostCell,
  getCurrentCell
)
const digitsToBinary = (digits: string) => Number(`0b${digits}`) || 0
const padWithEmptyString = (string: string) => ` ${string}`.trimEnd()
const combineIfLength = ifHasLength(combineValuesWithSpace)
const toUnderscore = () => "_"
const replaceEmptyWithUnderscore = ifEqualEmptyStringThen(toUnderscore)
const replaceEmptyValuesWithUnderscore = map(replaceEmptyWithUnderscore)
export const printTape: (machine: Machine) => string = compose(
  combineValuesToString,
  replaceEmptyValuesWithUnderscore,
  cellArrayToValues,
  getFullCellsArray
)
const markCellValue = (cell: Cell) => ({ ...cell, value: `[${cell.value}]` })
const identity = <T>(x: T): T => x
const ifCurrentCell = compose(ifPredicateThenElse, isMachineCurrentCell)
export const printTapeWithCursor = (machine: Machine) => {
  const isMachineCurrentCell = ifCurrentCell(machine)
  const markCurrentCell = isMachineCurrentCell(markCellValue, identity)
  const mapCellsWithMarkingCurrentCell = map(markCurrentCell)
  const print = compose(
    combineValuesToString,
    replaceEmptyValuesWithUnderscore,
    cellArrayToValues,
    mapCellsWithMarkingCurrentCell,
    getFullCellsArray
  )
  return print(machine)
}
export const calculateResult: (machine: Machine) => number = compose(
  digitsToBinary,
  combineValuesToString,
  onlyDigits,
  cellArrayToValues,
  getFullCellsArray
)
