export class UserFriendlyError extends Error {
  constructor(msg: string) {
    super(msg)
    Object.setPrototypeOf(this, UserFriendlyError.prototype)
  }
}

export function retrieveUserFriendlyError(
  error: unknown,
): UserFriendlyError | null {
  let currentError: unknown = error
  while (currentError instanceof Error) {
    if (currentError instanceof UserFriendlyError) {
      return currentError
    }
    currentError = currentError.cause
  }
  return null
}
