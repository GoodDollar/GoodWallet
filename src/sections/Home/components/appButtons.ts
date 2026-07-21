const MAX_VISIBLE_APP_BUTTONS = 7

export const partitionAppButtons = <T>(appButtons: T[]) => ({
  // Reserve the eighth grid position for the more button when needed.
  visible: appButtons.slice(0, MAX_VISIBLE_APP_BUTTONS),
  overflow: appButtons.slice(MAX_VISIBLE_APP_BUTTONS),
})
