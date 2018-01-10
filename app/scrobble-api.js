/* eslint-env browser, amd */
(function () {

  /**
   * Instantiable sound zone track scrobble API.
   *
   * @class
   * @param {string} zoneId - Zone id to fetch data for
   */
  function ScrobbleApi(zoneId) {
    if (typeof zoneId !== 'string' || !zoneId.length) {
      throw new Error('ScrobbleApi must be instantiated with a valid zoneId')
    }
    this.zoneId = zoneId
  }
  ScrobbleApi.playDate = playDate
  ScrobbleApi.prototype.fetchHistory = fetchHistory
  ScrobbleApi.prototype.subscribe = subscribe
  ScrobbleApi.prototype.playDate = playDate

  /**
   * Retrieves the latest scrobbles for the zone via the Radio API.
   *
   * @return {Promise} Resolves to array of scrobble objects.
   */
  function fetchHistory() {
    const url = 'https://radio.api.soundtrackyourbrand.com/sound_zones/'+this.zoneId+'/history_tracks/latest'
    return fetch(url, {
      headers: {
        'x-api-version': 10, // required header
      },
    }).then(res => res.json()).then(data => {
      // Scrobbles are returned in reverse order
      return data.sort((a, b) => playDate(a) - playDate(b))
    })
  }

  /**
   * Connect to the WebSocket API and subscribes to scrobble updates for the zone.
   * Includes a basic implmentation of the engine.io/socket.io protocols used
   * by the server, see the following pages for more details:
   * https://github.com/socketio/engine.io-protocol
   * https://github.com/socketio/socket.io-protocol
   *
   * @param {function} onScrobble - Function called whenever a track update is received
   * @return {object} WebSocket instance
   */
  function subscribe(onScrobble) {
    const self = this

    if (typeof onScrobble !== 'function') {
      throw new Error('ScrobbleApi must be instantiated with an onScrobble function')
    }

    self.socket = new WebSocket('wss://ws.soundtrackyourbrand.com/ws/?EIO=3&transport=websocket')

    function ping() {
      self.socket.send('2')
      setTimeout(ping, 20e3)
    }

    this.socket.onopen = function onOpen() {
      console.info('[socket] connected')
    }
    this.socket.onclose = function onClose() {
      console.info('[socket] disconnected')
    }
    this.socket.onmessage = function onMessage(msg) {
      // Minimal socket.io protocol implmentation
      let i = 0, type, namespace, payload // eslint-disable-line no-unused-vars
      // Act on each possible packet type
      switch (parseInt(msg.data.charAt(i++), 10)) {
        case 0: // OPEN
          payload = JSON.parse(msg.data.substr(i))
          ping()
          // Subscribe to track scrobbles for the zone
          self.socket.send('40/sound_zone/'+self.zoneId+'/scrobbles')
          return
        case 4: // MESSAGE
          type = parseInt(msg.data.charAt(i++), 10)
          namespace = '/'
          if (msg.data.charAt(i) === '/') {
            const iNamespace = i
            while (i < msg.data.length && msg.data.charAt(++i) !== ',');
            namespace = msg.data.substring(iNamespace, i++)
          }
          if (i < msg.data.length) {
            // Message payloads have format [eventName, ...data]
            payload = JSON.parse(msg.data.substr(i))
            onScrobble(payload[1].data)
            console.info('[socket]', payload[1].data)
          }
          // console.info('[socket]', {type, namespace, payload })
          return
      }
    }

    return self.socket
  }

  /**
   * Parses the oddly formatted date string present in the scrobble objects
   * into Date objects.
   *
   * @param {object} data - Scrobble data object
   * @return {Date} Play date
   */
  function playDate(data) {
    const str = data.iso8601_at
    return new Date(Date.UTC(
      str.substr(0, 4),
      parseInt(str.substr(4, 2), 10) - 1,
      str.substr(6, 2),
      str.substr(8, 2),
      str.substr(10, 2),
      str.substr(12, 2)
    ))
  }

  // Export as AMD/CommonJS module or global variable
  if (typeof module !== 'undefined' && module.exports) {
    ScrobbleApi.default = ScrobbleApi
    module.exports = ScrobbleApi
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
    define('api', [], function() { return ScrobbleApi })
  } else {
    window.ScrobbleApi = ScrobbleApi
  }
}());