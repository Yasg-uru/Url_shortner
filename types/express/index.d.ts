
declare global {
  namespace Express {
    interface User {
      _id: string;
      googleId: string;
      email: string;
      name: string;
      profilePicture: string;
      lastLogin: Date;
      createdAt: Date;
      updatedAt: Date;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
