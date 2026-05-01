export interface WorkLog {
  id?: string;
  uid: string;
  date: string;
  start: string;
  end: string;
  total: number;
  createdAt: any; // Server timestamp
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
