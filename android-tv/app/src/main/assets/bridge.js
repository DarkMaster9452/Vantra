// VANTRA bridge – vkladá ho Android TV appka do KAŽDÉHO rámca (aj do
// cross-origin iframov embed prehrávačov) ešte pred skriptmi stránky.
// Na PC ho do prehrávačov vkladá userscript /vantra-bridge.user.js.
//
// Čo robí:
//  - hlasitosť videí je zamknutá na 100 % a nedá sa stlmiť (hlasitosť rieši TV),
//    ovládanie hlasitosti sa v prehrávačoch vôbec nezobrazuje
//  - blokuje popupy / presmerovania z reklám (window.open, target=_blank, alert)
//  - Vantra stránka cez postMessage ovláda video vo vnorených iframoch
//    (play/pauza/posun/titulky/klik na súradnice) a dostáva späť jeho stav
//  - keď video beží, skryje celé UI prehrávača (tlačidlá, hlasitosť, stredové
//    play...) – zostane len obraz, ovláda sa výhradne lištou Vantry
//  - titulky prehrávača (stopy videa + zoznamy titulkov z jeho API) ponúkne
//    Vantre a vybrané titulky jej posiela riadok po riadku
//  - klávesy ovládača, ktoré omylom skončia v iframe, posiela späť Vantre
(function () {
  'use strict'
  if (window.__vantraBridge) return
  window.__vantraBridge = 2

  var isTop = window.top === window
  var frameId = Math.random().toString(36).slice(2)
  // TV appka (ovládač) – na PC si prehrávač nechá vlastné UI aj klávesy
  var isTV = /VantraTV/i.test(navigator.userAgent)

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

  // Ovládanie hlasitosti v prehrávačoch skryté (tlačidlo mute aj posuvník)
  var NO_VOLUME_CSS =
    '[aria-label*="volume" i],[aria-label*="mute" i],[title*="volume" i],[title*="mute" i],' +
    '[class*="volume" i],[id*="volume" i],[data-testid*="volume" i]{display:none!important}' +
    'media-mute-button,media-volume-slider,.jw-icon-volume,.jw-slider-volume,.plyr__volume,' +
    '[data-plyr="mute"],.vjs-volume-panel,.vjs-mute-control{display:none!important}'
  var noVolumeStyle = null
  function attachNoVolume() {
    var root = document.documentElement
    if (!root) return
    if (!noVolumeStyle) {
      noVolumeStyle = document.createElement('style')
      noVolumeStyle.textContent = NO_VOLUME_CSS
    }
    if (!root.contains(noVolumeStyle)) (document.head || root).appendChild(noVolumeStyle)
  }
  if (!isTop) {
    attachNoVolume()
    document.addEventListener('DOMContentLoaded', attachNoVolume)
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

  // ── Titulky: zoznamy titulkov z API prehrávača ─────────────────────
  // Prehrávače si zoznam titulkov sťahujú ako JSON (napr. captions: [{ url,
  // language }]). Odpovede sa len prečítajú, prehrávač ich dostane nezmenené.
  var subFiles = []
  var subSeen = {}
  var activeSub = null
  var subToken = 0
  var origFetch = window.fetch

  var SUB_URL = /\.(vtt|srt)(\?|#|$)/i
  var NOT_SUB = /\.(m3u8|mpd|mp4|m4s|ts|jpe?g|png|webp|gif)(\?|#|$)/i
  var URL_KEYS = ['url', 'file', 'src', 'link', 'path', 'download']
  var LABEL_KEYS = ['label', 'language', 'languageName', 'lang', 'display', 'name', 'title']
  var CODE_KEYS = ['srclang', 'lang', 'code', 'iso_639_1', 'language']
  var LANGS = {
    en: 'en', eng: 'en', english: 'en',
    sk: 'sk', slk: 'sk', slo: 'sk', slovak: 'sk', 'slovenčina': 'sk', slovencina: 'sk',
    cs: 'cs', cz: 'cs', ces: 'cs', cze: 'cs', czech: 'cs', 'čeština': 'cs', cestina: 'cs',
  }

  // Jazyk ako krátky kód (sk, en…), inak prvé slovo názvu – podľa neho si
  // Vantra pamätá, aké titulky zapnúť nabudúce
  function langOf(code, label) {
    var short = String(code || '').toLowerCase().split(/[-_]/)[0]
    var word = (String(label || '').toLowerCase().match(/[a-zà-ž]+/) || [''])[0]
    if (LANGS[short]) return LANGS[short]
    if (LANGS[word]) return LANGS[word]
    return /^[a-z]{2}$/.test(short) ? short : word || short
  }

  function first(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var value = obj[keys[i]]
      if (typeof value === 'string' && value) return value
    }
    return ''
  }

  function addSubFile(url, label, code) {
    try { url = new URL(url, location.href).href } catch (e) { return }
    if (subSeen[url] || subFiles.length >= 80) return
    subSeen[url] = 1
    var name = label || code || 'Subtitles ' + (subFiles.length + 1)
    subFiles.push({ id: 'f' + subFiles.length, label: name, lang: langOf(code, name), url: url })
    report()
  }

  function scanSubs(node, key, depth) {
    if (!node || typeof node !== 'object' || depth > 8) return
    if (Array.isArray(node)) {
      var listKey = /caption|subtitle|subs|track/i.test(key)
      for (var i = 0; i < node.length && i < 300; i++) {
        var item = node[i]
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          var url = first(item, URL_KEYS)
          var kind = String(item.kind || '')
          if (url && !NOT_SUB.test(url) && (SUB_URL.test(url) || listKey) && !/thumb|chapter|metadata/i.test(kind)) {
            addSubFile(url, first(item, LABEL_KEYS), first(item, CODE_KEYS))
          }
        }
        scanSubs(item, key, depth + 1)
      }
      return
    }
    for (var k in node) {
      if (Object.prototype.hasOwnProperty.call(node, k)) scanSubs(node[k], k, depth + 1)
    }
  }

  function inspectText(text) {
    if (typeof text !== 'string' || text.length > 3000000 || !/vtt|srt|caption|subtitle/i.test(text)) return
    try { scanSubs(JSON.parse(text), '', 0) } catch (e) {}
  }

  if (!isTop) {
    if (origFetch) {
      window.fetch = function () {
        var promise = origFetch.apply(window, arguments)
        promise.then(function (res) {
          try {
            if (res.type === 'opaque' || !/json|text\/plain/i.test(res.headers.get('content-type') || '')) return
            res.clone().text().then(inspectText, function () {})
          } catch (e) {}
        }, function () {})
        return promise
      }
    }
    // this = XMLHttpRequest, ktorý práve dobehol
    var inspectXhr = function () {
      try {
        if (!/json|text\/plain/i.test(this.getResponseHeader('content-type') || '')) return
        if (this.responseType === 'json') scanSubs(this.response, '', 0)
        else if (this.responseType === '' || this.responseType === 'text') inspectText(this.responseText)
      } catch (e) {}
    }
    try {
      var xhrSend = XMLHttpRequest.prototype.send
      XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', inspectXhr)
        return xhrSend.apply(this, arguments)
      }
    } catch (e) {}
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

  // Stopy titulkov priamo vo videu (napr. z HLS streamu)
  function nativeTracks(v) {
    var out = []
    var list = v.textTracks || []
    for (var i = 0; i < list.length; i++) {
      var t = list[i]
      if (!t.__vantra && (t.kind === 'subtitles' || t.kind === 'captions')) out.push(t)
    }
    return out
  }

  function subtitleOptions(v) {
    var out = nativeTracks(v).map(function (t, i) {
      var name = t.label || t.language || 'Track ' + (i + 1)
      return { id: 't' + i, label: name, lang: langOf(t.language, name) }
    })
    subFiles.forEach(function (f) {
      out.push({ id: f.id, label: f.label, lang: f.lang })
    })
    return out
  }

  // Stav ide rodičovi (nie rovno top), aby každý rámec po ceste vedel,
  // ktorým iframom sa ide k hlavnému videu (pre skrytie UI prehrávača)
  function report() {
    var v = mainVideo()
    if (!v) return
    try {
      window.parent.postMessage(
        {
          __vantra: 'state',
          frame: frameId,
          paused: v.paused,
          ended: v.ended,
          time: v.currentTime || 0,
          duration: isFinite(v.duration) ? v.duration : 0,
          buffering: v.readyState < 3 && !v.paused,
          subtitles: subtitleOptions(v),
          subtitle: activeSub,
        },
        '*'
      )
    } catch (e) {}
  }

  // ── Titulky: výber a posielanie riadkov Vantre ─────────────────────
  function cleanCue(text) {
    return String(text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim()
  }

  function postCue(text) {
    try { window.top.postMessage({ __vantra: 'cue', frame: frameId, text: text }, '*') } catch (e) {}
  }

  function toSeconds(stamp) {
    var parts = stamp.replace(',', '.').split(':')
    var total = 0
    for (var i = 0; i < parts.length; i++) total = total * 60 + parseFloat(parts[i])
    return total
  }

  // WebVTT aj SRT: bloky oddelené prázdnym riadkom, časy "00:01:02,500 --> …"
  function parseSubs(text) {
    var cues = []
    String(text).replace(/^﻿/, '').replace(/\r/g, '').split(/\n{2,}/).forEach(function (block) {
      var lines = block.split('\n')
      var i = 0
      while (i < lines.length && lines[i].indexOf('-->') === -1) i++
      if (i >= lines.length) return
      var m = /([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(lines[i])
      if (!m) return
      var start = toSeconds(m[1])
      var end = toSeconds(m[2])
      var body = lines.slice(i + 1).join('\n').trim()
      if (body && end > start) cues.push([start, end, body])
    })
    return cues
  }

  // Titulky sa nikdy nekreslia v prehrávači (mode "hidden"), riadky ide
  // zobraziť Vantra – rovnaký vzhľad pre všetky prehrávače
  function watchTrack(t) {
    t.oncuechange = function () {
      var lines = []
      var active = t.activeCues || []
      for (var i = 0; i < active.length; i++) lines.push(cleanCue(active[i].text))
      postCue(lines.join('\n'))
    }
  }

  function selectSub(v, id) {
    var token = ++subToken
    activeSub = null
    var list = v.textTracks || []
    for (var i = 0; i < list.length; i++) {
      if (list[i].kind === 'subtitles' || list[i].kind === 'captions') {
        list[i].oncuechange = null
        list[i].mode = 'disabled'
      }
    }
    postCue('')
    if (!id) return

    if (id.charAt(0) === 't') {
      var track = nativeTracks(v)[parseInt(id.slice(1), 10)]
      if (!track) return
      watchTrack(track)
      track.mode = 'hidden'
      activeSub = id
      return
    }

    var file = null
    subFiles.forEach(function (f) { if (f.id === id) file = f })
    if (!file || !origFetch) return
    activeSub = id
    origFetch.call(window, file.url)
      .then(function (res) { return res.text() })
      .then(function (text) {
        if (token !== subToken) return
        var cues = parseSubs(text)
        if (!cues.length) throw new Error('empty')
        var own = v.__vantraTrack
        if (!own) {
          own = v.__vantraTrack = v.addTextTrack('subtitles', 'Vantra', file.lang)
          own.__vantra = true
        }
        own.mode = 'hidden'
        while (own.cues && own.cues.length) own.removeCue(own.cues[0])
        cues.forEach(function (c) {
          try { own.addCue(new VTTCue(c[0], c[1], c[2])) } catch (e) {}
        })
        watchTrack(own)
        own.oncuechange()
        report()
      })
      .catch(function () {
        if (token !== subToken) return
        activeSub = null
        report()
      })
  }

  // ── Čisté video: UI prehrávača preč, zostane len obraz ─────────────
  // visibility sa dedí, ale potomok si ju môže zapnúť späť – skryje sa
  // všetko okrem hlavného videa (v rámcoch po ceste okrem iframu k nemu).
  // DOM prehrávača sa nemení, takže sa nič nerozbije.
  var CLEAN_CSS =
    'html,body{background:#000!important}' +
    'body *{visibility:hidden!important}' +
    '[data-vantra-keep]{visibility:visible!important}' +
    'video::-webkit-media-controls,video::-webkit-media-controls-enclosure{display:none!important}' +
    'video::-webkit-media-text-track-container{display:none!important}'
  var cleanStyle = null
  var cleanTarget = null
  // frame id → iframe v tomto dokumente, cez ktorý sa ide k tomu rámcu
  var childFor = {}

  function keepOnly(el) {
    var marked = document.querySelectorAll('[data-vantra-keep]')
    for (var i = 0; i < marked.length; i++) {
      if (marked[i] !== el) marked[i].removeAttribute('data-vantra-keep')
    }
    if (!el) {
      if (cleanStyle && cleanStyle.parentNode) cleanStyle.parentNode.removeChild(cleanStyle)
      return
    }
    if (!el.hasAttribute('data-vantra-keep')) el.setAttribute('data-vantra-keep', '')
    if (!cleanStyle) {
      cleanStyle = document.createElement('style')
      cleanStyle.textContent = CLEAN_CSS
    }
    if (!document.documentElement.contains(cleanStyle)) (document.head || document.documentElement).appendChild(cleanStyle)
  }

  function applyClean() {
    if (!cleanTarget) keepOnly(null)
    else if (cleanTarget === frameId) keepOnly(mainVideo())
    else keepOnly(childFor[cleanTarget] || null)
  }

  function frameElementFor(win) {
    var frames = document.querySelectorAll('iframe, frame')
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === win) return frames[i]
    }
    return null
  }

  // Simulovaný klik myšou na súradnice (štart prehrávača, ak nehrá sám)
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

  function clickAt(data) {
    var x = typeof data.x === 'number' ? data.x : window.innerWidth / 2
    var y = typeof data.y === 'number' ? data.y : window.innerHeight / 2
    var el = document.elementFromPoint(x, y)
    if (!el) return
    if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
      forwardToFrame(el, data, x, y)
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
      case 'subtitle':
        selectSub(v, typeof data.id === 'string' ? data.id : null)
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
      if (!data || typeof data !== 'object') return

      // Stav z vnoreného rámca → zapamätaj cestu k nemu a pošli ho vyššie
      if (data.__vantra === 'state' && typeof data.frame === 'string') {
        var el = e.source && e.source !== window ? frameElementFor(e.source) : null
        if (!el) return
        childFor[data.frame] = el
        if (cleanTarget === data.frame) keepOnly(el)
        try { window.parent.postMessage(data, '*') } catch (err) {}
        return
      }

      if (data.__vantra !== 'cmd') return
      if (data.action === 'click') {
        clickAt(data) // sám rozhodne, do ktorého vnoreného rámca ísť
        return
      }
      if (data.action === 'clean') {
        cleanTarget = typeof data.target === 'string' ? data.target : null
        applyClean()
      } else {
        applyCommand(data)
      }
      relayDown(data)
    })

    // Klávesy ovládača patria Vantre, nie prehrávaču v iframe (len TV appka)
    var KEYS = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Enter: 1, ' ': 1,
      Escape: 1, Backspace: 1, MediaPlayPause: 1, MediaPlay: 1, MediaPause: 1,
      MediaFastForward: 1, MediaRewind: 1, MediaTrackNext: 1, MediaTrackPrevious: 1,
    }
    window.addEventListener(
      'keydown',
      function (e) {
        if (!isTV || !KEYS[e.key]) return
        e.preventDefault()
        e.stopImmediatePropagation()
        try { window.top.postMessage({ __vantra: 'key', key: e.key, repeat: e.repeat }, '*') } catch (err) {}
      },
      true
    )

    // Autoplay + pravidelné hlásenie stavu (prehrávač môže video vymeniť,
    // čisté video sa preto drží na aktuálnom hlavnom videu)
    setInterval(function () {
      attachNoVolume() // stránka si mohla prepísať <head>
      var v = mainVideo()
      if (cleanTarget === frameId) keepOnly(v)
      if (!v) return
      if (!v.__vantraAutoplayed) {
        v.__vantraAutoplayed = true
        if (v.paused) v.play().catch(function () {})
      }
      report()
    }, 700)
  }
})()
