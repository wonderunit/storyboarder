/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as Scheduler from 'scheduler'

// Intentionally not named imports because Rollup would
// use dynamic dispatch for CommonJS interop named imports.
const { unstable_scheduleCallback: scheduleCallback, unstable_IdlePriority: IdlePriority } = Scheduler

export function createLRU(limit) {
  let LIMIT = limit

  // Circular, doubly-linked list
  let first = null
  let size = 0

  let cleanUpIsScheduled = false

  function scheduleCleanUp() {
    if (cleanUpIsScheduled === false && size > LIMIT) {
      // The cache size exceeds the limit. Schedule a callback to delete the
      // least recently used entries.
      cleanUpIsScheduled = true
      scheduleCallback(IdlePriority, cleanUp)
    }
  }

  function cleanUp() {
    cleanUpIsScheduled = false
    deleteLeastRecentlyUsedEntries(LIMIT)
  }

  function deleteLeastRecentlyUsedEntries(targetSize) {
    // Delete entries from the cache, starting from the end of the list.
    if (first !== null) {
      const resolvedFirst = first
      let last = resolvedFirst.previous
      while (size > targetSize && last !== null) {
        const onDelete = last.onDelete
        const previous = last.previous
        last.onDelete = null

        // Remove from the list
        last.previous = last.next = null
        if (last === first) {
          // Reached the head of the list.
          first = last = null
        } else {
          first.previous = previous
          previous.next = first
          last = previous
        }

        size -= 1

        // Call the destroy method after removing the entry from the list. If it
        // throws, the rest of cache will not be deleted, but it will be in a
        // valid state.
        onDelete()
      }
    }
  }

  function add(value, onDelete) {
    const entry = {
      value,
      onDelete,
      next: null,
      previous: null
    }
    if (first === null) {
      entry.previous = entry.next = entry
      first = entry
    } else {
      // Append to head
      const last = first.previous
      last.next = entry
      entry.previous = last

      first.previous = entry
      entry.next = first

      first = entry
    }
    size += 1
    return entry
  }

  function update(entry, newValue) {
    entry.value = newValue
  }

  function access(entry) {
    const next = entry.next
    if (next !== null) {
      // Entry already cached
      const resolvedFirst = first
      if (first !== entry) {
        // Remove from current position
        const previous = entry.previous
        previous.next = next
        next.previous = previous

        // Append to head
        const last = resolvedFirst.previous
        last.next = entry
        entry.previous = last

        resolvedFirst.previous = entry
        entry.next = resolvedFirst

        first = entry
      }
    } else {
      // Cannot access a deleted entry
      // TODO: Error? Warning?
    }
    scheduleCleanUp()
    return entry.value
  }

  function setLimit(newLimit) {
    LIMIT = newLimit
    scheduleCleanUp()
  }

  return { add, update, access, setLimit }
}

