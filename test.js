'use strict';

const tape = require('tape')
    , FamilyStore = require('./')

tape('instanceof', function (t) {
  const f1 = FamilyStore('f1', new Map)
  t.ok(f1 instanceof FamilyStore, 'instanceof')
  t.ok(FamilyStore.is(f1), 'is()')
  t.notOk(FamilyStore.is())
  t.notOk(FamilyStore.is({}))
  t.end()
})

function suite(name, storage) {
  function test(tname, fn) {
    tape(name + ': ' + tname, fn)
  }

  test('keys and pairs', function (t) {
    const f1 = FamilyStore('f1', storage({ a: 1, b: 0, c: true }))

    t.ok(Array.isArray(f1.keys()), 'keys')
    t.ok(Array.isArray(f1.ownKeys()), 'ownKeys')
    t.ok(Array.isArray(f1.pairs()), 'pairs')
    t.ok(Array.isArray(f1.ownPairs()), 'ownPairs')

    t.same(f1.keys(), ['a', 'b', 'c'])
    t.same(f1.ownKeys(), ['a', 'b', 'c'])
    t.same(f1.pairs(), [ ['a', 1], ['b', 0], ['c', true] ])
    t.same(f1.ownPairs(), [ ['a', 1], ['b', 0], ['c', true] ])

    const f2 = FamilyStore('f2', storage({ a: -1, b: -1, d: null }))
    f1.inherit(f2)

    t.same(f1.keys(), ['a', 'b', 'c', 'd'])
    t.same(f1.ownKeys(), ['a', 'b', 'c'])
    t.same(f1.pairs(), [ ['a', 1], ['b', 0], ['c', true], ['d', null] ])
    t.same(f1.ownPairs(), [ ['a', 1], ['b', 0], ['c', true] ])

    t.same(f2.keys(), ['a', 'b', 'd'])
    t.same(f2.ownKeys(), ['a', 'b', 'd'])
    t.same(f2.pairs(), [ ['a', -1], ['b', -1], ['d', null] ])
    t.same(f2.ownPairs(), [ ['a', -1], ['b', -1], ['d', null] ])

    f2.inherit(f1)

    t.same(f2.keys(), ['a', 'b', 'd', 'c'])
    t.same(f2.ownKeys(), ['a', 'b', 'd'])
    t.same(f2.pairs(), [ ['a', -1], ['b', -1], ['d', null], ['c', true] ])
    t.same(f2.ownPairs(), [ ['a', -1], ['b', -1], ['d', null] ])

    t.end()
  })

  test('shared dependencies', (t) => {
    const s1 = FamilyStore('s1', storage())
    const f1 = FamilyStore('f1', storage(), { inherit: [s1] })
    const f2 = FamilyStore('f2', storage(), { inherit: [s1] })
    const f3 = FamilyStore('f3', storage(), { inherit: [f1, f2] })

    const expectedOrder = [f3, f1, f2, s1]
    let i = 0

    t.plan(expectedOrder.length)

    f3.traverse(store => {
      t.is(store, expectedOrder[i].store, 'breadth-first traversal order is ok: ' + (i++))
    })
  })

  test('shared dependencies (2)', (t) => {
    const s1 = FamilyStore('s1', storage())
    const f1 = FamilyStore('f1', storage(), { inherit: [s1] })
    const f2 = FamilyStore('f2', storage(), { inherit: [s1] })
    const f3 = FamilyStore('f3', storage(), { inherit: [f1, s1, f2] })

    const expectedOrder = [f3, f1, s1, f2]
    let i = 0

    t.plan(expectedOrder.length)

    f3.traverse(store => {
      t.is(store, expectedOrder[i].store, 'breadth-first traversal order is ok: ' + (i++))
    })
  })

  test('shared dependencies (3)', (t) => {
    const s1 = FamilyStore('s1', storage())
    const f1 = FamilyStore('f1', storage(), { inherit: [s1] })
    const f2 = FamilyStore('f2', storage(), { inherit: [s1] })
    const f3 = FamilyStore('f3', storage(), { inherit: [f1, s1, f2, s1] })

    const expectedOrder = [f3, f1, s1, f2]
    let i = 0

    t.plan(expectedOrder.length)

    f3.traverse(store => {
      t.is(store, expectedOrder[i].store, 'breadth-first traversal order is ok: ' + (i++))
    })
  })

  test('shared dependencies (4)', (t) => {
    const f1 = FamilyStore('f1', storage())
        , f2 = FamilyStore('f2', storage(), { inherit: [f1] })
        , f3 = FamilyStore('f3', storage(), { inherit: [f2, f1] })
        , f4 = FamilyStore('f4', storage(), { inherit: [f1] })
        , f5 = FamilyStore('f5', storage(), { inherit: [f4, f3] })

    const expectedOrder
      = [ f5      // self
        , f4, f3  // deps of f5
        , f1      // deps of f4
        , f2 ]    // deps of f3, except f1 which was already visited

    let i = 0

    t.plan(expectedOrder.length)

    f5.traverse(store => {
      t.is(store, expectedOrder[i].store, 'breadth-first traversal order is ok: ' + (i++))
    })
  })

  test('toJSON() and keys()', (t) => {
    const f1 = FamilyStore('f1', storage())
        , f2 = FamilyStore('f2', storage(), { inherit: [f1] })
        , f3 = FamilyStore('f3', storage(), { inherit: [f2, f1] })
        , f4 = FamilyStore('f4', storage(), { inherit: [f1] })
        , f5 = FamilyStore('f5', storage(), { inherit: [f4, f3] })

    // Expected order
    f5.set('a', 1) // self
    f4.set('b', 2) // deps of f5
    f3.set('c', 3)
    f1.set('d', 4) // deps of f4
    f2.set('e', 5) // deps of f3, except f1 which was already visited

    f4.set('a', 'ignored')

    t.same(f5.keys(), ['a', 'b', 'c', 'd', 'e'])
    t.same(f5.toJSON(), { a: 1, b: 2, c: 3, d: 4, e: 5 })

    f2.set('c', 'ignored')
    f1.set('c', 'ignored')

    // Expected order: f3, f2, f1
    t.same(f3.keys(), ['c', 'e', 'd'])
    t.same(f3.toJSON(), { c: 3, e: 5, d: 4 })

    t.end()
  })

  test('equals', (t) => {
    const s1 = new FamilyStore('s1', storage())
    const s2 = new FamilyStore('s2', storage())

    s1.set('a', 1)
    s2.set('a', 2)

    t.notOk(s1.equals(s2), 's1 != s2')
    t.notOk(s2.equals(s1), 's2 != s1')

    s2.set('a', 1)

    t.ok(s1.equals(s2), 's1 == s2')
    t.ok(s2.equals(s1), 's2 == s1')

    s1.set('b', 'b')
    t.notOk(s1.equals(s2), 's1 != s2')

    s2.set('b', 'c')
    t.notOk(s1.equals(s2), 's1 != s2')

    s2.set('b', 'b')
    t.ok(s1.equals(s2), 's1 == s2')

    s1.set('c', 'c')
    s2.set('c', 'c')
    t.ok(s1.equals(s2), 's1 == s2')

    t.end()
  })

  test('__proto key is ignored', function (t) {
    const f1 = FamilyStore('f1', storage())
    f1.set('__proto', 34)
    f1.set('beep', 'boop')
    t.same(f1.toJSON(), { beep: 'boop' })
    t.end()
  })

  test('clear', function (t) {
    const f1 = FamilyStore('f1', storage({ a: 1 }))
        , f2 = FamilyStore('f2', storage({ a: 2, b: 3 }))

    f1.inherit(f2)
    t.same(f1.toJSON(), { a: 1, b: 3 })

    f1.clear()
    t.same(f1.toJSON(), { a: 2, b: 3 })
    t.same(f2.toJSON(), { a: 2, b: 3 })

    f2.clear()
    t.same(f1.toJSON(), {})
    t.same(f2.toJSON(), {})

    t.end()
  })

  test('recursion', (t) => {
    const f1 = FamilyStore('f1', storage())
        , f2 = FamilyStore('f2', storage())

    f1.inherit(f2)
    f2.inherit(f1)

    f1.set('f1', 23)
    f2.set('f2', 45)

    t.is(f1.get('f2'), 45)
    t.is(f2.get('f1'), 23)

    t.is(f1.get('no'), undefined, 'does not recurse') // yeh not a real test
    t.is(f2.get('no'), undefined, 'does not recurse')

    t.end()
  })
}

suite('object store', function storage(initial) {
  let s = initial || {}

  return {
    get(k) { return s[k] },
    set(k, v) { s[k] = v },
    keys() { return Object.keys(s) },
    delete(k) { delete s[k] },
    clear() { s = {} }
  }
})

suite('Map', function storage(initial) {
  const map = new Map
  for(let key in initial) map.set(key, initial[key])
  return map
})
