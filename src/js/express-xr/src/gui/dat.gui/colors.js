/**
 * dat-guiVR Javascript Controller Library for VR
 * https://github.com/dataarts/dat.guiVR
 *
 * Copyright 2016 Data Arts Team, Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const DEFAULT_COLOR = 0x2fa1d6
export const HIGHLIGHT_COLOR = 0x43b5ea
export const INTERACTION_COLOR = 0x07abf7
export const EMISSIVE_COLOR = 0x222222
export const HIGHLIGHT_EMISSIVE_COLOR = 0x999999
export const OUTLINE_COLOR = 0x999999
export const DEFAULT_BACK = 0x1a1a1a
export const DEFAULT_FOLDER_BACK = 0x101010
export const HIGHLIGHT_BACK = 0x313131
export const INACTIVE_COLOR = 0x161829
export const CONTROLLER_ID_SLIDER = 0x2fa1d6
export const CONTROLLER_ID_CHECKBOX = 0x806787
export const CONTROLLER_ID_BUTTON = 0xe61d5f
export const CONTROLLER_ID_TEXT = 0x1ed36f
export const CONTROLLER_ID_DROPDOWN = 0xfff000
export const DROPDOWN_BG_COLOR = 0xffffff
export const DROPDOWN_FG_COLOR = 0x000000
export const CHECKBOX_BG_COLOR = 0xffffff
export const BUTTON_COLOR = 0xe61d5f
export const BUTTON_HIGHLIGHT_COLOR = 0xfa3173
export const SLIDER_BG = 0x444444

export function colorizeGeometry(geometry, color) {
  geometry.faces.forEach(function(face) {
    face.color.setHex(color)
  })
  geometry.colorsNeedUpdate = true
  return geometry
}
