const { useMemo, useRef } = React = require('react')

// const SDFText = require('datguivr/modules/datguivr/sdftext')
// const textCreator = SDFText.creator()

// const SimpleText = ({
//   label,
//   textProps = {},
//   ...props
// }) => {
//   const group = useRef(null)

//   useMemo(() => {
//     if (group.current) {
//       // changed in dataguivr 0.1.6
//       group.current.update(label.toString())
//     } else {
//       group.current = textCreator.create(
//         label.toString(),
//         {
//           color: 0xffffff,
//           scale: 1,
//           centerText: false,
//           ...textProps
//         }
//       )
//     }
//   }, [label])

//   return <primitive {...props} object={group.current} />
// }

module.exports = SimpleText
