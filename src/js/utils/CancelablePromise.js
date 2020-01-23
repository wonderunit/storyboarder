class CancelablePromise {
  constructor(executor) {
    let _reject = null;
    const cancelablePromise = new Promise((resolve, reject) => {
      _reject = reject;
      return executor(resolve, reject);
    });
    cancelablePromise.cancel = _reject;

    return cancelablePromise;
  }
}

export default CancelablePromise