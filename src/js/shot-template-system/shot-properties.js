/*

head pose


*/

let shotProperties = {
  shotType: {
    ecu: {
      weight: 10
    },
    vcu: {
      weight: 10
    },
    cu: {
      weight: 10
    },
    mcu: {
      weight: 10
    },
    bust: {
      weight: 10
    },
    ms: {
      weight: 10
    },
    mls: {
      weight: 10
    },
    ls: {
      weight: 10
    },
    els: {
      weight: 10
    }
  },
  content: {
    oneShot: {
      weight: 10
    },
    twoShot: {
      weight: 10
    },
    threeShot: {
      weight: 10
    },
    ots: {
      weight: 30
    },
    groupShot: {
      weight: 10
    }
  },
  horizontalComposition: {
    auto: {
      weight: 9999
    },
    firstThird: {
      weight: 1
    }, 
    lastThird: {
      weight: 1
    },
    centered: {
      weight: 0.3
    }
  },
  horizontalAngle: {
    left: {
      weight: 1
    },
    center: {
      weight: 1
    },
    deadCenter: {
      weight: 1
    },
    right: {
      weight: 1
    }
  },
  verticalAngle: {
    birdsEye: {
      weight: 1
    },
    high: {
      weight: 3
    },
    eye: {
      weight: 10
    },
    low: {
      weight: 5
    },
    wormsEye: {
      weight: 2
    }
  },
  fov: {
    ultraWide: {
      weight: 1
    },
    wide: {
      weight: 8
    },
    medium: {
      weight: 10
    },
    long: {
      weight: 3
    }
  },
  headDirection: {
    headFront: {
      weight: 30
    },
    headUp: {
      weight: 1
    },
    headDown: {
      weight: 1
    },
    headLeft: {
      weight: 2
    },
    headRight: {
      weight: 2
    }
  },
  background: {
    light: {
      weight: 20
    },
    dim: {
      weight: 4
    },
    dark: {
      weight: 1
    },
    night: {
      weight: 1
    },
    fire: {
      weight: 0
    }
  },
  lightDirection: {
    abovelit: {
      weight: 1
    },
    frontlit: {
      weight: 1
    },
    frontleftlit: {
      weight: 1
    },
    frontrightlit: {
      weight: 1
    },
    backlit: {
      weight: 1
    },
    backleftlit: {
      weight: 1
    },
    backrightlit: {
      weight: 1
    },    
    underlit: {
      weight: 1
    },
    silhouette: {
      weight: 1
    },
  },
  roomSize: {
    smallRoom: {
      weight: 1
    },
    mediumRoom: {
      weight: 1
    },
    largeRoom: {
      weight: 1
    },
    extraLargeRoom: {
      weight: 1
    },
    auditorium: {
      weight: 1
    },
    outside: {
      weight: 1
    }
  }
}

module.exports = shotProperties