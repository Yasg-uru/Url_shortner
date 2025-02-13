
declare global {
  namespace Express {
    interface User {
      userId:string
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
