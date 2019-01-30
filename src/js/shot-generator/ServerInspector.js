const { useMemo } = require('react')
const { connect } = require('react-redux')
const qr = require('qr-image')

const h = require('../utils/h')

const ServerInspector = connect(
  state => ({
    server: state.server
  })
)(({ server }) => {
  const buffer = useMemo(() =>
    server.uri
      ? qr.imageSync(server.uri, { ec_level: 'H', type: 'png', size: 6, margin: 0 })
      : null,
    [server.uri])

  return buffer
    ? h(
        ['div', { style: { width: 100, padding: 6, marginBottom: 10 }}, [
          ['div', 'Use your phone to control the scene'],
          ['img', { src: `data:image/png;base64,` + buffer.toString('base64') }]
        ]]
      )
    : null
})

module.exports = ServerInspector