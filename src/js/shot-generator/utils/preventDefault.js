
const preventDefault = (fn, ...args) => e => {
    e.preventDefault()
    fn(e, ...args)
  }
export { preventDefault }