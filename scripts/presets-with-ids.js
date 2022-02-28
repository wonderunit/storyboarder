const presets = require('../src/js/windows/print-project/presets')

// via https://github.com/juanelas/object-sha/blob/5d0683d/src/ts/hashable.ts
const isObject = val =>
  (val != null) && (typeof val === 'object') && !(Array.isArray(val))

const objectToArraySortedByKey = (obj) => {
  if (!isObject(obj) && !Array.isArray(obj)) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (Array.isArray(item) || isObject(item)) {
        return objectToArraySortedByKey(item)
      }
      return item
    })
  }
  // if it is an object convert to array and sort
  return Object.keys(obj)
    .sort()
    .map((key) => {
      return [key, objectToArraySortedByKey(obj[key])]
    })
}

const hashable = data => JSON.stringify(objectToArraySortedByKey(data))

const digest = obj => {
  const encoder = new TextEncoder()
  const hashInput = encoder.encode(hashable(obj)).buffer
  return require('crypto')
          .createHash('SHA1')
          .update(Buffer.from(hashInput))
          .digest('hex')
          .slice(0, 7)
}

const mapKeyedByHashOfPresetData = list =>
  Object.fromEntries(
    Object.entries(list)
    .map(([id, preset]) => [`preset-${digest(hashable(preset.data))}`, preset])
  )

console.log(
  JSON.stringify(
    mapKeyedByHashOfPresetData(presets(str => str)),
    null,
    2
  )
)
