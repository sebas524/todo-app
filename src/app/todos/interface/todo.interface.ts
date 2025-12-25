export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  completedAt: number | null;
  priority: Priority;
}

export interface TodoList {
  id: string;
  name: string;
  todos: Todo[];
}
