import { describe, expect, it } from 'vitest'

import { FOL } from '~/fol'
import { TestData } from '~test/test-utils'

describe('FOL parser', () => {
  it.each(TestData.validFormulas)('can parse "%s"', (formula) => {
    const result = FOL.parse(formula).get()
    expect(result).toMatchSnapshot()
    // console.log(result)
  })

  it('can parse operators', () => {
    const result = FOL.parse('ff && tt || ff').get()
    expect(result.toFormattedString()).toMatchInlineSnapshot('"⊥ ∧ ⊤ ∨ ⊥"')
    expect(result).toMatchInlineSnapshot(`
      OrFormula {
        "left": AndFormula {
          "left": BooleanLiteral {
            "name": "⊥",
            "value": false,
          },
          "operator": "∧",
          "right": BooleanLiteral {
            "name": "⊤",
            "value": true,
          },
        },
        "operator": "∨",
        "right": BooleanLiteral {
          "name": "⊥",
          "value": false,
        },
      }
    `)
  })

  describe('can parse', () => {
    it('existential quantors', () => {
      const result = FOL.parse('exists c . A(c,c)').get()
      expect(result.toFormattedString()).toMatchInlineSnapshot('"∃c. A(c, c)"')
      expect(result).toMatchInlineSnapshot(`
        ExistentialQuantorFormula {
          "inner": BinaryRelation {
            "firstExpression": BoundVariable {
              "name": "c",
            },
            "name": "A",
            "secondExpression": BoundVariable {
              "name": "c",
            },
          },
          "quantor": "∃",
          "variable": BoundVariable {
            "name": "c",
          },
        }
      `)
    })

    it('universal quantors', () => {
      const result = FOL.parse('forall c . C(c)').get()
      expect(result.toFormattedString()).toMatchInlineSnapshot('"∀c. C(c)"')
      expect(result).toMatchInlineSnapshot(`
        UniversalQuantorFormula {
          "inner": UnaryRelation {
            "expression": BoundVariable {
              "name": "c",
            },
            "name": "C",
          },
          "quantor": "∀",
          "variable": BoundVariable {
            "name": "c",
          },
        }
      `)
    })

    it('relations', () => {
      const result = FOL.parse('A(a,a) && B(b)').get()
      expect(result.toFormattedString()).toMatchInlineSnapshot(
        '"A(a, a) ∧ B(b)"'
      )
      expect(result).toMatchInlineSnapshot(`
        AndFormula {
          "left": BinaryRelation {
            "firstExpression": Constant {
              "name": "a",
            },
            "name": "A",
            "secondExpression": Constant {
              "name": "a",
            },
          },
          "operator": "∧",
          "right": UnaryRelation {
            "expression": Constant {
              "name": "b",
            },
            "name": "B",
          },
        }
      `)
    })

    it('functions', () => {
      const result = FOL.parse('B(f(d))').get()
      expect(result.toFormattedString()).toMatchInlineSnapshot('"B(f(d))"')
      expect(result).toMatchInlineSnapshot(`
        UnaryRelation {
          "expression": UnaryFunction {
            "inner": Constant {
              "name": "d",
            },
            "name": "f",
          },
          "name": "B",
        }
      `)
    })

    it('long identifiers', () => {
      const result = FOL.parse('MyRelation(myFunction(a), second)').get()
      expect(result.toFormattedString()).toMatchInlineSnapshot(
        '"MyRelation(myFunction(a), second)"'
      )
      expect(result).toMatchInlineSnapshot(`
        BinaryRelation {
          "firstExpression": UnaryFunction {
            "inner": Constant {
              "name": "a",
            },
            "name": "myFunction",
          },
          "name": "MyRelation",
          "secondExpression": Constant {
            "name": "second",
          },
        }
      `)
    })
  })

  it('can parse parentheses', () => {
    const result = FOL.parse('(ff || tt) && tt').get()
    expect(result.toFormattedString()).toMatchInlineSnapshot('"(⊥ ∨ ⊤) ∧ ⊤"')
  })
})