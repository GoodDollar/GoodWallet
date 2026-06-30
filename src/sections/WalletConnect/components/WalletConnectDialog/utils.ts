export const getIcon = (url?: string, icons?: readonly string[]) => {
  if (!icons || !icons.length) return ""
  if (url && icons[0].startsWith("/")) return url + icons[0]
  return icons[0]
}
