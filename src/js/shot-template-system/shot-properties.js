/*

lower body pose
arm pose
head pose

fill with reference objects


*/

let shotProperties = {
  shotType: {
    ECU: {
      weight: 10
    },
    VCU: {
      weight: 10
    },
    MS: {
      weight: 80
    }
  },
  content: {
    oneShot: {
      weight: 10
    },
    twoShot: {
      weight: 10
    },
    threeshot: {
      weight: 10
    },
    OTS: {
      weight: 30
    },
    groupShot: {
      weight: 10
    }
  },
  composition: {
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
      weight: 0.3
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
    front: {
      weight: 10
    },
    up: {
      weight: 3
    },
    down: {
      weight: 1
    },
    left: {
      weight: 3
    },
    right: {
      weight: 3
    }
  },
  roomSize: {
    small: {
      weight: 3
    },
    medium: {
      weight: 5
    },
    large: {
      weight: 2
    },
    extraLarge: {
      weight: 0.5
    },
    outside: {
      weight: 5
    }
  }
}

module.exports = shotProperties