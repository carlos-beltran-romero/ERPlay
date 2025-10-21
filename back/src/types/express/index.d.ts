// src/types/express/index.d.ts
import { UserRole } from '../../models/User';

declare global {
  namespace Express {
    interface Request {
      /** Solo los datos que descifras del JWT */
      user?: { 
        id: string;
        role: UserRole;
      };
    }
  }
}
export {};
