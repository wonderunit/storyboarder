const {
  complement,
  isNil,
  when,
  propEq,
  evolve,
  map,
  omit,
  pipe
} = require('ramda')

const isPresent = complement(isNil)

module.exports = sceneObject =>
  when(
    // for character scene objects ...
    propEq('type', 'character'),
    evolve(
      {
        // ... when skeleton is present ...
        skeleton: when(isPresent,
          // ... for every bone ...
          map(
            // ... omit quaternion and position ...
            omit(['quaternion', 'position'])
          )
        )
      }
    )
  )(
    pipe(
      // always omit `loaded` property, for all scene objects
      omit(['loaded']),
      // always omit `blocked` property, for all scene objects
      omit(['blocked'])
    )(sceneObject)
  )
