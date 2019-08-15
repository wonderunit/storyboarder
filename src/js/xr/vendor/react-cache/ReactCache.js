/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { createLRU } from './LRU'

const Pending = 0
const Resolved = 1
const Rejected = 2

function identityHashFn(input) {
  return input
}

const CACHE_LIMIT = 500
const lru = createLRU(CACHE_LIMIT)
const entries = new Map()

function accessResult(resource, fetch, input, key) {
  let entriesForResource = entries.get(resource)
  if (entriesForResource === undefined) {
    entriesForResource = new Map()
    entries.set(resource, entriesForResource)
  }
  let entry = entriesForResource.get(key)
  if (entry === undefined) {
    const thenable = fetch(input)
    thenable.then(
      value => {
        if (newResult.status === Pending) {
          const resolvedResult = newResult
          resolvedResult.status = Resolved
          resolvedResult.value = value
        }
      },
      error => {
        if (newResult.status === Pending) {
          const rejectedResult = newResult
          rejectedResult.status = Rejected
          rejectedResult.value = error
        }
      }
    )
    const newResult = { status: Pending, value: thenable }
    const newEntry = lru.add(newResult, deleteEntry.bind(null, resource, key))
    entriesForResource.set(key, newEntry)
    return newResult
  } else {
    return lru.access(entry)
  }
}

function deleteEntry(resource, key) {
  const entriesForResource = entries.get(resource)
  if (entriesForResource !== undefined) {
    entriesForResource.delete(key)
    if (entriesForResource.size === 0) {
      entries.delete(resource)
    }
  }
}

export function unstable_createResource(fetch, maybeHashInput) {
  const hashInput = maybeHashInput !== undefined ? maybeHashInput : identityHashFn

  const resource = {
    read(input) {
      const result = accessResult(resource, fetch, input, hashInput(input))
      switch (result.status) {
        case Resolved:
          return result.value
        case Pending:
        case Rejected:
          throw result.value
        default:
          return undefined
      }
    },
    preload(input) {
      accessResult(resource, fetch, input, hashInput(input))
    }
  }
  return resource
}

export function unstable_setGlobalCacheLimit(limit) {
  lru.setLimit(limit)
}

