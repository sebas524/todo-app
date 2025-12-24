export interface Todo {
  id: number;
  title: string;
  done: boolean;
  // NEW: when it was completed; null if not completed
  completedAt: number | null;
}
