// via https://davidwalsh.name/fetch-timeout
function fetchWithTimeout (input, init = {}, timeoutInMsecs = 10000, fetcher = window.fetch) {
  return new Promise(function (resolve, reject) {
    let elapsed = false

    const timeout = setTimeout(
      function () {
        elapsed = true
        reject(new Error('Request timed out'))
      },
      timeoutInMsecs
    )

    fetcher(input, init)
      .then(function (response) {
        // cleanup the timeout
        clearTimeout(timeout)

        // if setTimeout hasn't rejected yet
        if ( !elapsed ) {
          resolve(response)
        }
      })
      .catch(function (err) {
        // if setTimeout already rejected
        if (elapsed) return

        // otherwise, reject with error
        reject(err)
      })
    })
}

module.exports = fetchWithTimeout
