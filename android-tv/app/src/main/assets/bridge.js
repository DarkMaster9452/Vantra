// VANTRA bridge – vkladá ho Android TV appka do KAŽDÉHO rámca (aj do
// cross-origin iframov embed prehrávačov) ešte pred skriptmi stránky.
//
// Čo robí:
//  - hlasitosť videí je zamknutá na 100 % a nedá sa stlmiť (hlasitosť rieši TV)
//  - blokuje popupy / presmerovania z reklám (window.open, target=_blank, alert)
//  - Vantra stránka cez postMessage ovláda video vo vnorených iframoch
//    (play/pauza/posun/klik na súradnice) a dostáva späť jeho stav
//  - klávesy ovládača, ktoré omylom skončia v iframe, posiela späť Vantre
(function () {
  'use strict'
  if (window.__vantraBridge) return
  window.__vantraBridge = 1

  var isTop = window.top === window
  var frameId = Math.random().toString(36).slice(2)

  // ── Hlasitosť: vždy 100 %, nikdy mute ──────────────────────────────
  try {
    var proto = HTMLMediaElement.prototype
    var volDesc = Object.getOwnPropertyDescriptor(proto, 'volume')
    var mutedDesc = Object.getOwnPropertyDescriptor(proto, 'muted')
    Object.defineProperty(proto, 'volume', {
      configurable: true,
      get: function () { return volDesc.get.call(this) },
      set: function () { volDesc.set.call(this, 1) },
    })
    Object.defineProperty(proto, 'muted', {
      configurable: true,
      get: function () { return mutedDesc.get.call(this) },
      set: function () { mutedDesc.set.call(this, false) },
    })
    Object.defineProperty(proto, 'defaultMuted', {
      configurable: true,
      get: function () { return false },
      set: function () {},
    })
  } catch (e) {}

  function lockVolume(v) {
    if (v.__vantraLocked) return
    v.__vantraLocked = true
    v.removeAttribute('muted')
    var fix = function () {
      try {
        if (v.muted) mutedDesc.set.call(v, false)
        if (v.volume !== 1) volDesc.set.call(v, 1)
      } catch (e) {}
    }
    v.addEventListener('volumechange', fix)
    v.addEventListener('play', fix)
    v.addEventListener('playing', report)
    v.addEventListener('pause', report)
    v.addEventListener('ended', report)
    v.addEventListener('loadedmetadata', report)
    v.addEventListener('seeked', report)
    fix()
  }

  // ── Reklamy: žiadne popupy ani presmerovania z iframov ─────────────
  if (!isTop) {
    var noop = function () { return null }
    try {
      Object.defineProperty(window, 'open', { value: noop, writable: false, configurable: false })
    } catch (e) {
      window.open = noop
    }
    window.alert = function () {}
    window.confirm = function () { return false }
    window.prompt = function () { return null }

    // Odkazy, ktoré by otvárali nové okno alebo menili celú stránku
    document.addEventListener(
      'click',
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null
        if (!a) return
        var target = (a.getAttribute('target') || '').toLowerCase()
        var href = a.getAttribute('href') || ''
        if (target === '_blank' || target === '_top' || target === '_parent' || /^(intent|market):/i.test(href)) {
          e.preventDefault()
          e.stopImmediatePropagation()
        }
      },
      true
    )
  }

  // ── Video v tomto rámci ────────────────────────────────────────────
  function videos() {
    return Array.prototype.slice.call(document.querySelectorAll('video'))
  }

  // Hlavné video = najväčšie viditeľné (reklamné videá bývajú malé/krátke)
  function mainVideo() {
    var best = null
    var bestScore = 0
    videos().forEach(function (v) {
      lockVolume(v)
      var r = v.getBoundingClientRect()
      var score = r.width * r.height + (isFinite(v.duration) ? v.duration : 0) * 1000
      if (score > bestScore) {
        bestScore = score
        best = v
      }
    })
    return best
  }

  function report() {
    var v = mainVideo()
    if (!v) return
    try {
      window.top.postMessage(
        {
          __vantra: 'state',
          frame: frameId,
          paused: v.paused,
          ended: v.ended,
          time: v.currentTime || 0,
          duration: isFinite(v.duration) ? v.duration : 0,
          buffering: v.readyState < 3 && !v.paused,
        },
        '*'
      )
    } catch (e) {}
  }

  // Simulovaný klik myšou na súradnice (virtuálny kurzor / štart prehrávača)
  function fire(el, type, x, y) {
    var opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 }
    try {
      if (type.indexOf('pointer') === 0 && window.PointerEvent) {
        el.dispatchEvent(new PointerEvent(type, Object.assign({ pointerType: 'mouse', isPrimary: true }, opts)))
      } else {
        el.dispatchEvent(new MouseEvent(type, opts))
      }
    } catch (e) {}
  }

  function forwardToFrame(el, data, x, y) {
    var r = el.getBoundingClientRect()
    var copy = {}
    for (var k in data) copy[k] = data[k]
    copy.x = x - r.left
    copy.y = y - r.top
    try { el.contentWindow.postMessage(copy, '*') } catch (e) {}
  }

  function pointerAction(data) {
    var x = typeof data.x === 'number' ? data.x : window.innerWidth / 2
    var y = typeof data.y === 'number' ? data.y : window.innerHeight / 2
    var el = document.elementFromPoint(x, y)
    if (!el) return
    if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
      forwardToFrame(el, data, x, y)
      return
    }
    if (data.action === 'move') {
      fire(el, 'pointermove', x, y)
      fire(el, 'mousemove', x, y)
      fire(el, 'mouseover', x, y)
      return
    }
    fire(el, 'pointerover', x, y)
    fire(el, 'mouseover', x, y)
    fire(el, 'pointerdown', x, y)
    fire(el, 'mousedown', x, y)
    fire(el, 'pointerup', x, y)
    fire(el, 'mouseup', x, y)
    if (typeof el.click === 'function') el.click()
    else fire(el, 'click', x, y)
  }

  function applyCommand(data) {
    if (data.target && data.target !== frameId) return
    var v = mainVideo()
    if (!v) return
    switch (data.action) {
      case 'play':
        v.play().catch(function () {})
        break
      case 'pause':
        v.pause()
        break
      case 'toggle':
        if (v.paused) v.play().catch(function () {})
        else v.pause()
        break
      case 'seek':
        v.currentTime = Math.max(0, Math.min(data.value, v.duration || data.value))
        break
      case 'seekBy':
        v.currentTime = Math.max(0, Math.min(v.currentTime + data.value, v.duration || Infinity))
        break
    }
    report()
  }

  function relayDown(data) {
    for (var i = 0; i < window.frames.length; i++) {
      try { window.frames[i].postMessage(data, '*') } catch (e) {}
    }
  }

  if (!isTop) {
    window.addEventListener('message', function (e) {
      var data = e.data
      if (!data || data.__vantra !== 'cmd') return
      if (data.action === 'click' || data.action === 'move') {
        pointerAction(data) // sám rozhodne, do ktorého vnoreného rámca ísť
        return
      }
      applyCommand(data)
      relayDown(data)
    })

    // Klávesy ovládača patria Vantre, nie prehrávaču v iframe
    var KEYS = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Enter: 1, ' ': 1,
      Escape: 1, Backspace: 1, MediaPlayPause: 1, MediaPlay: 1, MediaPause: 1,
      MediaFastForward: 1, MediaRewind: 1, MediaTrackNext: 1, MediaTrackPrevious: 1,
    }
    window.addEventListener(
      'keydown',
      function (e) {
        if (!KEYS[e.key]) return
        e.preventDefault()
        e.stopImmediatePropagation()
        try { window.top.postMessage({ __vantra: 'key', key: e.key, repeat: e.repeat }, '*') } catch (err) {}
      },
      true
    )

    // Autoplay + pravidelné hlásenie stavu
    setInterval(function () {
      var v = mainVideo()
      if (!v) return
      if (!v.__vantraAutoplayed) {
        v.__vantraAutoplayed = true
        if (v.paused) v.play().catch(function () {})
      }
      report()
    }, 700)
  }
})()
