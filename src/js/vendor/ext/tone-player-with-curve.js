const Tone = require('tone')

// HACK
//
// modified to support `curve`
// `curve` can be `linear` (default) or `exponential`
//
Tone.Player = class extends Tone.Player {
  constructor (url, onload) {
    super(url, onload)
    this.curve = 'linear' // ADDED for Storyboarder
  }

  _start (startTime, offset, duration) {
  	//if it's a loop the default offset is the loopstart point
  	if (this._loop){
  		offset = Tone.defaultArg(offset, this._loopStart);
  	} else {
  		//otherwise the default offset is 0
  		offset = Tone.defaultArg(offset, 0);
  	}
  
  	//compute the values in seconds
  	offset = this.toSeconds(offset);
  	duration = Tone.defaultArg(duration, Math.max(this._buffer.duration - offset, 0));
  	duration = this.toSeconds(duration);
  	startTime = this.toSeconds(startTime);
  
  	// //make the source
  	this._source = new Tone.BufferSource({
  		"buffer" : this._buffer,
  		"loop" : this._loop,
  		"loopStart" : this._loopStart,
  		"loopEnd" : this._loopEnd,
  		"playbackRate" : this._playbackRate,
  		"fadeIn" : this.fadeIn,
  		"fadeOut" : this.fadeOut,

      "curve": this.curve // ADDED for Storyboarder

  	}).connect(this.output);
  
  	//set the looping properties
  	if (!this._loop && !this._synced){
  		//if it's not looping, set the state change at the end of the sample
  		this._state.setStateAtTime(Tone.State.Stopped, startTime + duration);
  	}
  
  	//start it
  	if (this._loop){
  		this._source.start(startTime, offset);
  	} else {
  		this._source.start(startTime, offset, duration);
  	}
  	return this;
  };
}