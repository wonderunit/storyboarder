// via https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js/9542157

const os = require('os')

const getIpAddresses = () => {
  let results = []

  let ifaces = os.networkInterfaces()

  Object.keys(ifaces).forEach(ifname => {
    let alias = 0

    ifaces[ifname].forEach(iface => {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        // console.log(ifname + ':' + alias, iface.address)
        results.push(iface.address)
      } else {
        // this interface has only one ipv4 adress
        // console.log(ifname, iface.address)
        results.push(iface.address)
      }
      ++alias
    })
  })

  return results
}

const getIpAddress = () => {
  let addresses = getIpAddresses()
  return addresses.length
    ? addresses[0]
    : null
}

module.exports = getIpAddress
