// Works out how the visitor can add the site to their home screen.
// iPadOS 13+ reports itself as a Mac, so touch points tell it apart from desktop Safari.
export function detectInstall(ua = '', { touchPoints = 0, standalone = false } = {}) {
  const isIOS = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
  const isAndroid = /Android/.test(ua)
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : null

  let browser = 'other'
  if (isIOS) {
    // CriOS (Chrome), FxiOS (Firefox), EdgiOS (Edge) and OPiOS (Opera) cannot use the iOS "Add to Home Screen" flow.
    if (/Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) browser = 'safari'
  } else if (isAndroid) {
    if (/SamsungBrowser/.test(ua)) browser = 'samsung'
    else if (/Chrome\//.test(ua) && !/; wv\)|EdgA|OPR|Firefox/.test(ua)) browser = 'chrome'
  }

  return { platform, browser, mobile: platform !== null, installed: standalone }
}
