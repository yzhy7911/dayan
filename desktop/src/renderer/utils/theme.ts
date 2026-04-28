const THEME_KEY = 'dayan-theme'

export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  return 'light'
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark-theme')
  } else {
    html.classList.remove('dark-theme')
  }
}

export function toggleTheme(): Theme {
  const current = getTheme()
  const next = current === 'light' ? 'dark' : 'light'
  saveTheme(next)
  return next
}
