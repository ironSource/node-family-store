# family-store

**A storage-agnostic store with parents. If the store doesn't have a key, it asks its parents, who ask their parents, et cetera (breadth-first). Circular dependencies are okay.**

[![npm status](http://img.shields.io/npm/v/family-store.svg?style=flat-square)](https://www.npmjs.org/package/family-store) [![node](https://img.shields.io/node/v/family-store.svg?style=flat-square)](https://www.npmjs.org/package/family-store)

## example

```js
const JSONStore = require('atomic-json-store')
const FamilyStore = require('family-store')

const one = FamilyStore('one', JSONStore('one.json'))
const two = FamilyStore('two', new Map)

one.inherit(two)
two.inherit(one)

two.set('host', 'two.com')
one.get('host') === 'two.com';
one.getOwn('host') === undefined;
one.getOwner('host').owner === two;

one.set('host', 'one.com')
one.set('port', 8080)

one.get('host') === 'one.com';
two.get('port') === 8080;
```

## `FamilyStore(name, storage, [options])`

The `storage` should have the following synchronous interface:

- `get(key)`
- `set(key, value)`
- `delete(key)` or `remove(key)`
- `keys()` (array or iterable)
- `clear()` (optional, falls back to `delete()` all `keys()`)

Options:

- **inherit**: array of parents to `inherit()` from

### `inherit(parent)`

Add a parent store to inherit from. Returns `false` if it already inherits from `parent` or if `parent` is the store itself, otherwise `true`.

### `get(key)` or `getOwn(key)`

Get a value with or without inheritance.

### `getOwner(key)`

Returns an object with these properties:

- **owner**: the first found store that has a value for `key`
- **value**
- **depth**: traversal depth (0 if `owner` is the store itself)

### `set(key, value)`

Set own value of key.

### `delete(key)` or `remove(key)`

Delete own value of key.

### `clear()`

Delete all own values.

### `keys()` or `ownKeys()`

Returns an array of keys with or without inheritance.

### `pairs()` or `ownPairs()`

Returns an array of `[key, value]` pairs with or without inheritance.

### `toJSON()`

Get an object with all values, own and inherited.

### `equals(familyStore)`

`a.equals(b)` is true if `a.toJSON()` deep equals `b.toJSON().`

### `traverse(function)`

Breadth-first traversal, starting with the store itself. The `function` is called once for every `store` with the arguments `storage`, `store` and `depth` until the function returns a value other than `undefined`.

```js
const a = FamilyStore('a', storage())
const b = FamilyStore('b', storage())
const c = FamilyStore('c', storage())
const d = FamilyStore('d', storage())

a.inherit(b)
a.inherit(c)

b.inherit(a)
b.inherit(d)

a.traverse(function(storage, store, depth){
  console.log('%s: %d', store.name, depth)
})
```

Gives:

```
a: 0
b: 1
c: 1
d: 2
```

## install

With [npm](https://npmjs.org) do:

```
npm install family-store
```

## license

[MIT](http://opensource.org/licenses/MIT) © ironSource.
