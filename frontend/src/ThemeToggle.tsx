import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const nextDark = !dark
    document.documentElement.classList.toggle('dark', nextDark)
    setDark(nextDark)
    try {
      localStorage.setItem('reddit-clone-theme', nextDark ? 'dark' : 'light')
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Dark mode"
      aria-pressed={dark}
      className="ml-auto rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:outline-orange-400"
    >
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
