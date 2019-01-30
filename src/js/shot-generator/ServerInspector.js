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
      ? qr.imageSync(server.uri, { ec_level: 'H', type: 'png', size: 6, margin: 0, parse_url: true })
      : null,
    [server.uri])

  return buffer
    ? h(
        ['div.server-inspector', { style: { display: 'flex', justifyContent: 'flex-end', padding: 24 }}, [
          ['div', { style: { width: '6rem', textAlign: 'right', paddingRight: 18 }}, 'Use your phone to direct the scene:'],
          ['img', { src: `data:image/png;base64,` + buffer.toString('base64') }]
        ]]
      )
    : null
})

module.exports = ServerInspector