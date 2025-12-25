import { computed, effect, Injectable, signal } from '@angular/core';
import { Priority, Todo } from '../interface/todo.interface';

export type TodoFilter = 'all' | 'active' | 'done';

@Injectable({
  providedIn: 'root',
})
export class TodoStoreService {
  private readonly STORAGE_KEY = 'todos_v1';

  private readonly priorityRank: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  // ✅ State (source of truth)
  readonly todos = signal<Todo[]>([
    {
      id: 1,
      title: 'take out trash',
      done: false,
      completedAt: null,
      priority: 'medium',
    },
    {
      id: 2,
      title: 'study for exams',
      done: false,
      completedAt: null,
      priority: 'medium',
    },
  ]);

  // ✅ Derived state (read-only view)
  readonly sortedTodos = computed(() => {
    const list = this.todos();

    const active = list
      .filter((t) => !t.done)
      .sort(
        (a, b) => this.priorityRank[a.priority] - this.priorityRank[b.priority]
      );

    const done = list
      .filter((t) => t.done)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));

    return [...active, ...done];
  });

  readonly filteredTodos = computed(() => {
    const filter = this.filter();
    const list = this.sortedTodos();

    if (filter === 'active') return list.filter((t) => !t.done);
    if (filter === 'done') return list.filter((t) => t.done);
    return list;
  });

  readonly filter = signal<TodoFilter>('all');

  constructor() {
    // ✅ Load from storage (safe parse)
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.todos.set(JSON.parse(saved));
      } catch {}
    }

    // ✅ Persist whenever todos changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.todos()));
    });
  }

  setFilter(filter: TodoFilter) {
    this.filter.set(filter);
  }

  // ✅ Actions (the only way UI should mutate state)

  addTodo(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;

    const nextId = this.todos().length
      ? Math.max(...this.todos().map((t) => t.id)) + 1
      : 1;

    this.todos.update((prev) => [
      ...prev,
      {
        id: nextId,
        title: trimmed,
        done: false,
        completedAt: null,
        priority: 'medium',
      },
    ]);
  }

  removeTodo(id: number) {
    this.todos.update((prev) => prev.filter((t) => t.id !== id));
  }

  toggleTodo(id: number) {
    this.todos.update((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextDone = !t.done;
        return {
          ...t,
          done: nextDone,
          completedAt: nextDone ? Date.now() : null,
        };
      })
    );
  }

  editTodo(payload: { id: number; title: string }) {
    this.todos.update((prev) =>
      prev.map((t) =>
        t.id === payload.id ? { ...t, title: payload.title } : t
      )
    );
  }

  changePriority(payload: { id: number; priority: Priority }) {
    this.todos.update((prev) =>
      prev.map((t) =>
        t.id === payload.id ? { ...t, priority: payload.priority } : t
      )
    );
  }
}
