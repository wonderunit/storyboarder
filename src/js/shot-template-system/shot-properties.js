/*

  subject rotation
  correct weighting
  background object fill


*/

let shotProperties = {
  shotType: {
    ecu: {
      caption: "Extreme closeup",
      weight: 10
    },
    vcu: {
      caption: "Very closeup",
      weight: 10
    },
    cu: {
      caption: "Closeup",
      weight: 10
    },
    mcu: {
      caption: "Medium closeup",
      weight: 10
    },
    bust: {
      weight: 10
    },
    ms: {
      caption: "Medium shot",
      weight: 10
    },
    mls: {
      caption: "Medium long shot",
      weight: 10
    },
    ls: {
      caption: "Long shot",
      weight: 10
    },
    els: {
      caption: "Extreme long shot",
      weight: 10
    }
  },
  content: {
    oneShot: {
      caption: "Single",
      weight: 10
    },
    twoShot: {
      caption: "Double",
      weight: 10
    },
    threeShot: {
      caption: "Three shot",
      weight: 10
    },
    ots: {
      caption: "Over the shoulder",
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
  },
  pose: {
    stand: {
      weight: 1
    },
    walk: {
      weight: 1
    },
    run: {
      weight: 1
    },
    point: {
      weight: 1
    },
    sit_in_chair: {
      weight: 1
    },
    hunch_over: {
      weight: 1
    },
    cross_arms: {
      weight: 1
    },
    hands_in_pockets: {
      weight: 1
    },
    cautious: {
      weight: 1
    },
    lean_back: {
      weight: 1
    },
    hold_something: {
      weight: 1
    },
    turn_around: {
      weight: 1
    },
    wide_stance: {
      weight: 1
    },
    kneeling: {
      weight: 1
    },
    sit_on_floor: {
      weight: 1
    },
    squatting: {
      weight: 1
    },
    indian_style: {
      weight: 1
    },
    on_back: {
      weight: 1
    },
    slouch: {
      weight: 1
    },
    fall: {
      weight: 1
    },
    despair: {
      weight: 1
    },
    get_up: {
      weight: 0
    },
    on_fours: {
      weight: 0
    },
    sit_hug_knees: {
      weight: 0
    },
    holding_flashlight: {
      weight: 0
    },
    brace_for_explosion: {
      weight: 0
    },
    pushback_by_explosion: {
      weight: 0
    },
    touch_out_in_front: {
      weight: 0
    },
    gun_point_side: {
      weight: 0
    },
    punch: {
      weight: 0
    },
    sit_hands_on_table: {
      weight: 0
    },
    sit_talk: {
      weight: 0
    },
    door_open: {
      weight: 0
    },
    sit_hands_folded_under_chin: {
      weight: 0
    },
    standing_over_table: {
      weight: 0
    },
    walk_look_back: {
      weight: 0
    },
    jump_over: {
      weight: 0
    },
    sit_typing: {
      weight: 0
    },
    cellphone_chat: {
      weight: 0
    },
    climbing_up_stairs: {
      weight: 0
    },
    climbing_down_stairs: {
      weight: 0
    },
    dive: {
      weight: 0
    },
    hang_one_arm: {
      weight: 0
    },
    welcome_open_arms: {
      weight: 0
    },
    on_bicycle: {
      weight: 0
    },
    sit_lean_table: {
      weight: 0
    },
    on_skateboard: {
      weight: 0
    },
    cellphone_talk: {
      weight: 0
    },
    crawl: {
      weight: 0
    },
    run_lateral: {
      weight: 0
    },
    reach_above: {
      weight: 0
    },
    reach_jump_forward: {
      weight: 0
    },
    talk_explain: {
      weight: 0
    },
  },
  model: {
    female: {
      weight: 1
    },
    male: {
      weight: 1
    },
    boxmodel: {
      weight: 1
    },
  }
}

module.exports = shotProperties