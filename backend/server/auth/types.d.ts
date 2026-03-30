import 'express';

// Application user shape stored on req.user after successful authentication.
declare global {
  namespace Express {
    interface User {
      pid: string;
      email: string;
      name: string;
    }
  }
}

export {};