import pidusage  from 'pidusage'

export default async (reg, res) => {
  const stats = await pidusage(process.pid)
  // => {
  //   cpu: 10.0,            // percentage (from 0 to 100*vcore)
  //   memory: 357306368,    // bytes
  //   ppid: 312,            // PPID
  //   pid: 727,             // PID
  //   ctime: 867000,        // ms user + system time
  //   elapsed: 6650000,     // ms since the start of the process
  //   timestamp: 864000000  // ms since epoch
  // }


  res.send({
    memory: Math.round(stats.memory / 1024 / 1024),
    cpu: +stats.cpu.toFixed(2)
  })
}