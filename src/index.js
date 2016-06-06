'use strict';

const inherits = require('util').inherits

function FamilyStoreFactory (name, store, opts) {
  if (!(this instanceof FamilyStoreFactory)) {
    return new FamilyStoreFactory(name, store, opts)
  }

  FamilyStore.call(this, name, store, opts)
}

class FamilyStore {
  static is(instance) {
    if (typeof instance === 'object' && (instance instanceof FamilyStore))
      return true

    if (typeof instance.name !== 'string' || instance.name === '')
      return false

    if (typeof instance.store !== 'object' || instance.store === null)
      return false

    if (!Array.isArray(instance.parents))
      return false

    return true
  }

  constructor(name, store, opts) {
    if (typeof name !== 'string' || name === '') {
      throw new Error('Name must be a non-empty string')
    }

    if (typeof store !== 'object' || store === null) {
      throw new Error('Store must be an object')
    }

    this.name = name
    this.store = store
    this.parents = []

    if (opts && opts.inherit) {
      opts.inherit.forEach(p => this.inherit(p))
    }
  }

  inherit(parent) {
    if (!FamilyStore.is(parent)) {
      throw new Error('Not a family store compatible object')
    }

    const dups = this.parents.concat(this).filter(function(current) {
      return current === parent || current.name === parent.name
    })

    if (!dups.length) {
      this.parents.push(parent)
      return true
    } else {
      return false
    }
  }

  get(k) {
    return this.traverse(store => store.get(k))
  }

  getOwn(k) {
    return this.store.get(k)
  }

  getOwner(k) {
    return this.traverse((store, owner, depth) => {
      const value = store.get(k)
      if (value !== undefined) return { value, owner, depth }
    }) || {};
  }

  set(k, v) {
    this.store.set(k, v)
    return this
  }

  delete(k) {
    if (this.store.delete) this.store.delete(k)
    else this.store.remove(k)
    return this
  }

  clear() {
    if (this.store.clear) {
      this.store.clear()
    } else {
      const keys = this.keys()
      for(let i=0; i<keys.length; i++) this.delete(keys[i])
    }

    return this
  }

  keys() {
    const acc = []

    this.traverse(store => {
      const keys = store.keys()
      for(let i=0, l=keys.length; i<l; i++) {
        const key = keys[i]
        if (acc.indexOf(key) < 0) acc.push(key)
      }
    })

    return acc
  }

  ownKeys() {
    return this.store.keys()
  }

  pairs() {
    const kv = []
    const seen = new Set

    this.traverse(store => {
      const keys = store.keys()

      for(let i=0, l=keys.length; i<l; i++) {
        const key = keys[i]

        if (!seen.has(key)) {
          const value = store.get(key)

          if (value !== undefined) {
            seen.add(key)
            kv.push([key, value])
          }
        }
      }
    })

    return kv
  }

  ownPairs() {
    return this.store.keys().map(key => {
      return [key, this.store.get(key)]
    })
  }

  toJSON() {
    const obj = {}

    this.traverse(store => {
      const keys = store.keys()

      for(let i=0, l=keys.length; i<l; i++) {
        const key = keys[i]
        if (obj[key] === undefined) {
          const val = store.get(key)
          if (val !== undefined) obj[key] = val
        }
      }
    })

    return obj
  }

  equals(other) {
    if (other === this) return true

    const a = this.pairs()
        , b = other.pairs()

    if (a.length !== b.length) return false

    a.sort(compareFirstElement)
    b.sort(compareFirstElement)

    for(let i=0, l=a.length; i<l; i++) {
      if (a[i][0] !== b[i][0]) return false // keys
      if (a[i][1] !== b[i][1]) return false // values
    }

    return true
  }

  // Breadth-first traversal
  traverse(fn) {
    const stack = [ [this, 0] ]
    const visited = new Set

    let pair;

    while(pair = stack.shift()) {
      const node = pair[0], depth = pair[1]

      if (visited.has(node)) continue
      else visited.add(node)

      const v = fn(node.store, node, depth)
      if (v !== undefined) return v

      node.parents.forEach(p => stack.push([p, depth + 1]))
    }
  }
}

FamilyStore.prototype.remove = FamilyStore.prototype.delete
FamilyStore.prototype.inherits = FamilyStore.prototype.inherit

module.exports = FamilyStoreFactory
inherits(FamilyStoreFactory, FamilyStore)

function compareFirstElement(a_, b_) {
  const a = a_[0], b = b_[0]

  if (a === b) return 0
  if (a < b) return -1
  if (a > b) return 1

  throw new RangeError(`Unstable sort: ${a} vs ${b}`)
}
