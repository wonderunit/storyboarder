function configureElectronLog (log) {
  // For compatibility with older versions of Storyboarder,
  //   write all process logs to a single log,
  //     and name it as we had before.
  //
  // Note that as of electron-log 4.x, the directory for logs on Windows and Linux changed,
  //   and we don't try to override the directory name,
  //     which means users might retain old electron-log 3.x logs on their system in the old directory
  //
  // Reference:
  // - https://github.com/megahertz/electron-log/blob/master/docs/migration.md
  // - https://github.com/megahertz/electron-log/issues/194#issuecomment-628492930
  log.transports.file.fileName = 'log.log'

  return log
}

module.exports = configureElectronLog(require('electron-log'))
