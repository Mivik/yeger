export type VariableAssignment = Record<string, number>

export type UnsafeRecord<T extends string | number, U> = Partial<Record<T, U>>

export type Constants = UnsafeRecord<string, number>
type UnaryFunctions = UnsafeRecord<string, UnsafeRecord<number, number>>

type BinaryFunctions = UnsafeRecord<
  string,
  UnsafeRecord<number, UnsafeRecord<number, number>>
>

type UnaryRelations = UnsafeRecord<string, Set<number>>

type BinaryRelations = UnsafeRecord<string, UnsafeRecord<number, Set<number>>>

export interface Model {
  readonly nodes: Set<number>
  readonly functions: {
    readonly binary: BinaryFunctions
    readonly constants: Constants
    readonly unary: UnaryFunctions
  }
  readonly relations: {
    readonly binary: BinaryRelations
    readonly unary: UnaryRelations
  }
}

export interface TreeNode {
  text(): string
  children(): TreeNode[]
  depth(): number
}

export interface FOLFragment extends TreeNode {
  toFormattedString(): string
}

export interface Formula extends FOLFragment {
  evaluate(model: Model, variableAssignment: VariableAssignment): boolean
}

export class ParenthesizedFormula implements Formula {
  public constructor(public readonly inner: Formula) {}

  public text(): string {
    return '()'
  }

  public children(): TreeNode[] {
    return [this.inner]
  }

  public depth(): number {
    return this.inner.depth() + 1
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    return this.inner.evaluate(model, variableAssignment)
  }

  public toFormattedString(): string {
    return `(${this.inner.toFormattedString()})`
  }
}

export abstract class BinaryFormula implements Formula {
  public constructor(
    public readonly left: Formula,
    public readonly operator: string,
    public readonly right: Formula
  ) {}

  public text(): string {
    return this.operator
  }

  public children(): TreeNode[] {
    return [this.left, this.right]
  }

  public depth(): number {
    return Math.max(this.left.depth(), this.right.depth()) + 1
  }

  public abstract evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean

  public toFormattedString(): string {
    return `${this.left.toFormattedString()} ${
      this.operator
    } ${this.right.toFormattedString()}`
  }
}
export class OrFormula extends BinaryFormula {
  public constructor(left: Formula, right: Formula) {
    super(left, '\u2228', right)
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    return (
      this.left.evaluate(model, variableAssignment) ||
      this.right.evaluate(model, variableAssignment)
    )
  }
}

export class AndFormula extends BinaryFormula {
  public constructor(left: Formula, right: Formula) {
    super(left, '\u2227', right)
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    return (
      this.left.evaluate(model, variableAssignment) &&
      this.right.evaluate(model, variableAssignment)
    )
  }
}
export class ImplFormula extends BinaryFormula {
  public constructor(left: Formula, right: Formula) {
    super(left, '\u2192', right)
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    return (
      !this.left.evaluate(model, variableAssignment) ||
      this.right.evaluate(model, variableAssignment)
    )
  }
}
export class BiImplFormula extends BinaryFormula {
  public constructor(left: Formula, right: Formula) {
    super(left, '\u2194', right)
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    const left = this.left.evaluate(model, variableAssignment)
    const right = this.right.evaluate(model, variableAssignment)
    return (left && right) || (!left && !right)
  }
}

export abstract class UnaryFormula implements Formula {
  public constructor(
    public readonly inner: Formula,
    public readonly operator: string
  ) {}

  public text(): string {
    return this.operator
  }

  public children(): TreeNode[] {
    return [this.inner]
  }

  public depth(): number {
    return this.inner.depth() + 1
  }

  public abstract evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean

  public toFormattedString(): string {
    return `${this.operator}(${this.inner.toFormattedString()})`
  }
}

export class NotFormula extends UnaryFormula {
  public constructor(inner: Formula) {
    super(inner, '\u00AC')
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    return !this.inner.evaluate(model, variableAssignment)
  }
}

export abstract class QuantorFormula implements Formula {
  public constructor(
    public readonly variable: BoundVariable,
    public readonly inner: Formula,
    public readonly quantor: string
  ) {}

  public text(): string {
    return `${this.quantor}${this.variable.name}`
  }

  public children(): TreeNode[] {
    return [this.inner]
  }

  public depth(): number {
    return this.inner.depth() + 1
  }

  public abstract evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean

  public toFormattedString(): string {
    return `${this.text()}. ${this.inner.toFormattedString()}`
  }
}

export class UniversalQuantorFormula extends QuantorFormula {
  public constructor(variable: BoundVariable, inner: Formula) {
    super(variable, inner, '\u2200')
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    for (const node of model.nodes.values()) {
      const newAssignment = {
        ...variableAssignment,
        [this.variable.name]: node,
      }
      if (!this.inner.evaluate(model, newAssignment)) {
        return false
      }
    }
    return true
  }
}

export class ExistentialQuantorFormula extends QuantorFormula {
  public constructor(variable: BoundVariable, inner: Formula) {
    super(variable, inner, '\u2203')
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    for (const node of model.nodes.values()) {
      const newAssignment = {
        ...variableAssignment,
        [this.variable.name]: node,
      }
      if (this.inner.evaluate(model, newAssignment)) {
        return true
      }
    }
    return false
  }
}

export interface Relation extends Formula {}

export class BooleanLiteral implements Formula {
  private constructor(
    public readonly name: string,
    public readonly value: boolean
  ) {}

  public text(): string {
    return this.name
  }

  public children(): TreeNode[] {
    return []
  }

  public depth(): number {
    return 0
  }

  public evaluate(): boolean {
    return this.value
  }

  public toFormattedString(): string {
    return this.name
  }

  public static readonly True = new BooleanLiteral('\u22A4', true)
  public static readonly False = new BooleanLiteral('\u22A5', false)
}

export class UnaryRelation implements Relation {
  public constructor(
    public readonly name: string,
    public readonly expression: Expression
  ) {}

  public text(): string {
    return this.name
  }

  public children(): TreeNode[] {
    return [this.expression]
  }

  public depth(): number {
    return this.expression.depth() + 1
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    const relation = model.relations.unary[this.name]
    if (!relation) {
      throw new Error(`Missing unary relation ${this.name}`)
    }
    const interpreted = this.expression.interpret(model, variableAssignment)
    return relation.has(interpreted)
  }

  public toFormattedString(): string {
    return `${this.name}(${this.expression.toFormattedString()})`
  }
}

export class BinaryRelation implements Relation {
  public constructor(
    public readonly name: string,
    public readonly firstExpression: Expression,
    public readonly secondExpression: Expression
  ) {}

  public text(): string {
    return this.name
  }

  public children(): TreeNode[] {
    return [this.firstExpression, this.secondExpression]
  }

  public depth(): number {
    return (
      Math.max(this.firstExpression.depth(), this.secondExpression.depth()) + 1
    )
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    const relation = model.relations.binary[this.name]
    if (!relation) {
      throw new Error(`Missing binary relation ${this.name}`)
    }

    const firstInterpreted = this.firstExpression.interpret(
      model,
      variableAssignment
    )
    const tupleCandidates = relation[firstInterpreted]
    if (!tupleCandidates) {
      return false
    }

    const secondInterpreted = this.secondExpression.interpret(
      model,
      variableAssignment
    )
    return tupleCandidates.has(secondInterpreted)
  }

  public toFormattedString(): string {
    return `${
      this.name
    }(${this.firstExpression.toFormattedString()}, ${this.secondExpression.toFormattedString()})`
  }
}

export class EqualityRelation implements Relation {
  public constructor(
    public readonly firstExpression: Expression,
    public readonly secondExpression: Expression
  ) {}

  public text(): string {
    return '='
  }

  public children(): TreeNode[] {
    return [this.firstExpression, this.secondExpression]
  }

  public depth(): number {
    return (
      Math.max(this.firstExpression.depth(), this.secondExpression.depth()) + 1
    )
  }

  public evaluate(
    model: Model,
    variableAssignment: VariableAssignment
  ): boolean {
    const firstInterpreted = this.firstExpression.interpret(
      model,
      variableAssignment
    )
    const secondInterpreted = this.secondExpression.interpret(
      model,
      variableAssignment
    )
    return firstInterpreted === secondInterpreted
  }

  public toFormattedString(): string {
    return `${this.firstExpression.toFormattedString()} = ${this.secondExpression.toFormattedString()}`
  }
}

export interface Expression extends FOLFragment {
  interpret(model: Model, variableAssignment: VariableAssignment): number
}

export class Constant implements Expression {
  public constructor(public readonly name: string) {}

  public text(): string {
    return this.name
  }

  public children(): TreeNode[] {
    return []
  }

  public depth(): number {
    return 0
  }

  public toFormattedString(): string {
    return this.name
  }

  public interpret(model: Model): number {
    const interpreted = model.functions.constants[this.name]
    if (interpreted === undefined) {
      throw new Error(`Missing constant ${this.name}`)
    }
    return interpreted
  }
}

export class UnaryFunction implements Expression {
  public constructor(
    public readonly name: string,
    public readonly inner: Expression
  ) {}

  public text(): string {
    return `${this.name}()`
  }

  public children(): TreeNode[] {
    return [this.inner]
  }

  public depth(): number {
    return this.inner.depth() + 1
  }

  public toFormattedString(): string {
    return `${this.name}(${this.inner.toFormattedString()})`
  }

  public interpret(
    model: Model,
    variableAssignment: VariableAssignment
  ): number {
    const unaryFunction = model.functions.unary[this.name]
    if (unaryFunction === undefined) {
      throw new Error(`Missing unary function ${this.name}`)
    }
    const innerInterpreted = this.inner.interpret(model, variableAssignment)
    const interpreted = unaryFunction[innerInterpreted]
    if (interpreted === undefined) {
      throw new Error(
        `Non-total unary function ${this.name}(${innerInterpreted})`
      )
    }
    return interpreted
  }
}

export class BinaryFunction implements Expression {
  public constructor(
    public readonly name: string,
    public readonly firstArgument: Expression,
    public readonly secondArgument: Expression
  ) {}

  public text(): string {
    return `${this.name}()`
  }

  public children(): TreeNode[] {
    return [this.firstArgument, this.secondArgument]
  }

  public depth(): number {
    return Math.max(this.firstArgument.depth(), this.secondArgument.depth()) + 1
  }

  public toFormattedString(): string {
    return `${
      this.name
    }(${this.firstArgument.toFormattedString()}, ${this.secondArgument.toFormattedString()})`
  }

  public interpret(
    model: Model,
    variableAssignment: VariableAssignment
  ): number {
    const binaryFunction = model.functions.binary[this.name]
    if (binaryFunction === undefined) {
      throw new Error(`Missing binary function ${this.name}`)
    }
    const firstInterpreted = this.firstArgument.interpret(
      model,
      variableAssignment
    )
    const curriedFunction = binaryFunction[firstInterpreted]
    if (curriedFunction === undefined) {
      throw new Error(
        `Non-total binary function ${this.name}(${firstInterpreted}, ...)`
      )
    }
    const secondInterpreted = this.secondArgument.interpret(
      model,
      variableAssignment
    )
    const interpreted = curriedFunction[secondInterpreted]
    if (interpreted === undefined) {
      throw new Error(
        `Non-total binary function ${this.name}(${firstInterpreted}, ${secondInterpreted})`
      )
    }
    return interpreted
  }
}

export class BoundVariable implements Expression {
  public constructor(public readonly name: string) {}

  public text(): string {
    return this.name
  }

  public children(): TreeNode[] {
    return []
  }

  public depth(): number {
    return 0
  }

  public toFormattedString(): string {
    return this.name
  }

  public interpret(_: Model, variableAssignment: VariableAssignment): number {
    return variableAssignment[this.name]
  }
}