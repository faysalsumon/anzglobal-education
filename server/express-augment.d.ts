declare namespace Express {
  interface Request {
    user: any;
    logIn(user: any, done: (err: any) => void): void;
    logOut(options: any, done: (err: any) => void): void;
  }
}
