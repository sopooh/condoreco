'use client'

function openCookieModal() {
  window.dispatchEvent(new CustomEvent('condoreco:open-cookie-modal'))
}

export default function CookiePreferencesButton() {
  return (
    <button
      className="btn btn-ghost"
      onClick={openCookieModal}
      type="button"
      style={{ marginTop: 8 }}
    >
      Gestisci preferenze cookie
    </button>
  )
}
