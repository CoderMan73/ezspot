import 'express-session'

declare module 'express-session' {
  // Return path preserved across CAS redirects to bring users back to requested UI route.
  interface SessionData {
    authReturnTo?: string
  }
}
