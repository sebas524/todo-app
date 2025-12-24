export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
  completedAt: number | null;
  priority: Priority;
}
