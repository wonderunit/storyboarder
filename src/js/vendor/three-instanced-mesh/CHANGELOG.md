# Changelog

## [Unreleased]
- Rewrite everything with es6
- Leverage `onBeforeCompile` and nuke the monkey patch?

## [85.3.3] - 02-18-2018
### Fixed
- example code in README.md, i was uninitialized

## [85.3.2] - 01-31-2018
### Added
- call to feedback and use cases in README.md

## [85.3.2] - 01-10-2018
### Fixed
- `needsUpdate(undefined)` bug when no color attribute is present. 

## [85.3.1] - 12-26-2017
### Added
- Changelog

### Changed
- Changed const material names to capital snake case
- Changed the shader that was calling `getInstanceMatrix()` to do the def catch `_instancedMatrix`
- Updated `uv_pars_vertex` to newer version of three
- Changed `transpose` to be `transposeMat3` to work with newer version
- Fixed the shaderChunk keys, the color stuff had `'.glsl'` in it
- Changed example to be like the one hosted live and more uptodate
