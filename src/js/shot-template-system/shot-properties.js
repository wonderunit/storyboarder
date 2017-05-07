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
      weight: 10
    },
    headUp: {
      weight: 3
    },
    headDown: {
      weight: 1
    },
    headLeft: {
      weight: 3
    },
    headRight: {
      weight: 3
    }
  },
  roomSize: {
    smallRoom: {
      weight: 3
    },
    mediumRoom: {
      weight: 5
    },
    largeRoom: {
      weight: 2
    },
    extraLargeRoom: {
      weight: 0.5
    },
    outside: {
      weight: 5
    }
  }
}

module.exports = shotProperties