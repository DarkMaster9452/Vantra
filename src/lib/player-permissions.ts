// Apply directly to each iframe as well as the site-wide Permissions-Policy.
// Firefox/Zen support iframe permissions more broadly than the HTTP header.
// Unsupported directives are ignored by the browser; this does not block popups.
export const PLAYER_IFRAME_ALLOW = [
  'autoplay', 'encrypted-media', 'fullscreen', 'picture-in-picture',
  "camera 'none'", "microphone 'none'", "geolocation 'none'",
  "clipboard-read 'none'", "clipboard-write 'none'", "display-capture 'none'",
  "payment 'none'", "usb 'none'", "serial 'none'", "hid 'none'",
  "bluetooth 'none'", "midi 'none'", "web-share 'none'",
].join('; ')
