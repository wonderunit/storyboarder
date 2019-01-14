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
      weight: 30
    },
    mcu: {
      caption: "Medium closeup",
      weight: 40
    },
    bust: {
      weight: 50
    },
    ms: {
      caption: "Medium shot",
      weight: 90
    },
    mls: {
      caption: "Medium long shot",
      weight: 50
    },
    ls: {
      caption: "Long shot",
      weight: 40
    },
    els: {
      caption: "Extreme long shot",
      weight: 30
    }
  },
  content: {
    oneShot: {
      caption: "Single",
      weight: 80
    },
    twoShot: {
      caption: "Double",
      weight: 1
    },
    threeShot: {
      caption: "Three shot",
      weight: 1
    },
    ots: {
      caption: "Over the shoulder",
      weight: 20
    },
    groupShot: {
      weight: 1
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
      weight: 20
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
      weight: 30
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
      weight: 0
    },
  },
  roomSize: {
    smallRoom: {
      weight: 1
    },
    mediumRoom: {
      weight: 5
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
      weight: 10
    }
  },
  pose: {
    stand: {
      weight: 95
    },
    walk: {
      weight: 1
    },
    run: {
      weight: 0
    },
    point: {
      weight: 1
    },
    sit_in_chair: {
      weight: 1
    },
    hunch_over: {
      weight: 0
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
      weight: 0
    },
    hold_something: {
      weight: 0
    },
    turn_around: {
      weight: 0
    },
    wide_stance: {
      weight: 0
    },
    kneeling: {
      weight: 0
    },
    sit_on_floor: {
      weight: 0
    },
    squatting: {
      weight: 0
    },
    cross_legged: {
      weight: 0
    },
    on_back: {
      weight: 0
    },
    slouch: {
      weight: 1
    },
    fall: {
      weight: 0
    },
    despair: {
      weight: 0
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
    sit_lean_table: {
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
    sit_talk: {
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
    arms_open: {
      weight: 0
    },
    laugh: {
      weight: 0
    },
    defiant: {
      weight: 0
    },
    scared: {
      weight: 0
    },
    motorcycle: {
      weight: 0
    },
    motorcycle_turn: {
      weight: 0
    },
    fly: {
      weight: 0
    },
    zero_gravity: {
      weight: 0
    },
    threaten_knife: {
      weight: 0
    },
    gun_tactical: {
      weight: 0
    },
    throw: {
      weight: 0
    },
    jog: {
      weight: 0
    },
    stand_baby: {
      weight: 0
    },
    climb_ladder: {
      weight: 0
    },
    swim: {
      weight: 0
    },
    car_drive: {
      weight: 0
    },
    car_turn: {
      weight: 0
    },
    car_passenger: {
      weight: 0
    },
    sit_uncooperative: {
      weight: 0
    },
    injury_shoulder: {
      weight: 0
    },
    hit_from_behind: {
      weight: 0
    },
    choking: {
      weight: 0
    },
    freefall: {
      weight: 0
    },
    prisoner: {
      weight: 0
    },
    hands_up: {
      weight: 0
    },
    hi: {
      weight: 0
    },
    plead: {
      weight: 0
    },
    sit_reading: {
      weight: 0
    },
    sit_sorrow: {
      weight: 0
    },
    stand_sorrow: {
      weight: 0
    },
    beggar: {
      weight: 0
    },
    stand_watch: {
      weight: 0
    },
    hide: {
      weight: 0
    },
    sleep: {
      weight: 0
    },
    stop: {
      weight: 0
    },
    dead: {
      weight: 0
    },
    smoke: {
      weight: 0
    },
    drink: {
      weight: 0
    },
    umbrella: {
      weight: 0
    },
    frustrated: {
      weight: 0
    },
    sweeping: {
      weight: 0
    },
    lift: {
      weight: 0
    },
    skateboard_coasting: {
      weight: 0
    },
    skateboard_wide_turn: {
      weight: 0
    },
    stand_backpack: {
      weight: 0
    },
    tuck_roll: {
      weight: 0
    },
    door_close: {
      weight: 0
    },
    back_against_wall: {
      weight: 0
    },
    kick_high: {
      weight: 0
    },
    sit_lounge: {
      weight: 0
    },
    sit_tv: {
      weight: 0
    },
    dance: {
      weight: 0
    },
    peek_in: {
      weight: 0
    },
  },
  model: {
    female: {
      weight: 50
    },
    male: {
      weight: 50
    },
    boxmodel: {
      weight: 1
    },
  }
}

module.exports = shotProperties
