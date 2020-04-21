# Gamepad API Test

Test XRInputSource gamepad handlers using normal gamepads and the browser Gamepad API

    parcel serve test/views/gamepads/index.html

View `console.log` for output.

Some game controllers will not report a connection until an actual input event happens, e.g.: plugging in via USB is not enough to dispatch the connection event.
