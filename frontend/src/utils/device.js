import { instagramChatUrl, instagramProfileUrl } from '@/config/site'

// Is this a phone or tablet? A simple check is enough here:
// - newer Chrome/Edge on Android say so directly (navigator.userAgentData.mobile)
// - otherwise look for phone/tablet words in the browser's user agent text
// - iPads pretend to be a Mac, but a Mac has no touch screen
// When we cannot tell, the answer is false, so the safe profile link is used.
export function isPhoneOrTablet() {
  try {
    if (navigator.userAgentData?.mobile) return true
    const ua = navigator.userAgent || ''
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true
    return false
  } catch {
    return false
  }
}

// Where the "Copy and open Instagram" button goes:
// phones and tablets open her chat in the Instagram app; everything else opens her profile.
export function instagramLink() {
  const opensChat = isPhoneOrTablet()
  return { url: opensChat ? instagramChatUrl : instagramProfileUrl, opensChat }
}
