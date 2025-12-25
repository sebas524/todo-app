import { Priority, Todo, TodoList } from '../interface/todo.interface';

import { Injectable, computed, effect, signal } from '@angular/core';

export type TodoFilter = 'all' | 'active' | 'done';

@Injectable({ providedIn: 'root' })
export class TodoStoreService {
  private readonly STORAGE_KEY = 'todos_v1';

  private readonly priorityRank: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  // ✅ MULTI-LIST STATE
  readonly lists = signal<TodoList[]>([
    {
      id: 'default',
      name: 'Default',
      todos: [
        {
          id: 'effefeffefe',
          title: 'take out trash',
          done: false,
          completedAt: null,
          priority: 'medium',
        },
        {
          id: 'ekdjfjs',
          title: 'study for exams',
          done: false,
          completedAt: null,
          priority: 'medium',
        },
      ],
    },
  ]);

  readonly selectedListId = signal<string>('default');

  // ✅ FILTER STATE
  readonly filter = signal<TodoFilter>('all');
  setFilter(filter: TodoFilter) {
    this.filter.set(filter);
  }

  // ✅ SELECTED LIST + TODOS
  readonly selectedList = computed(() => {
    const id = this.selectedListId();
    return this.lists().find((l) => l.id === id) ?? null;
  });

  readonly todos = computed<Todo[]>(() => {
    return this.selectedList()?.todos ?? [];
  });

  // ✅ SORTED + FILTERED VIEW
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

  constructor() {
    // ✅ LOAD from localStorage (with migration)
    const saved = localStorage.getItem(this.STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // NEW format: TodoList[]
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          'todos' in parsed[0]
        ) {
          const lists = parsed as TodoList[];
          this.lists.set(lists);

          // ensure selectedListId valid
          const exists = lists.some((l) => l.id === this.selectedListId());
          if (!exists) this.selectedListId.set(lists[0].id);
        }
        // OLD format: Todo[]
        else if (
          Array.isArray(parsed) &&
          (parsed.length === 0 || (parsed.length > 0 && 'title' in parsed[0]))
        ) {
          const legacyTodos = parsed as Todo[];

          this.lists.set([
            {
              id: 'default',
              name: 'Default',
              todos: legacyTodos,
            },
          ]);
          this.selectedListId.set('default');
        }
      } catch {
        // ignore corrupted storage
      }
    }

    // ✅ SAVE whenever lists changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.lists()));
    });

    // ✅ extra safety: if selectedListId points nowhere, fix it
    effect(() => {
      const lists = this.lists();
      const selected = this.selectedListId();
      if (lists.length > 0 && !lists.some((l) => l.id === selected)) {
        this.selectedListId.set(lists[0].id);
      }
    });
  }

  // ✅ HELPER: update todos of selected list
  private updateSelectedListTodos(updater: (todos: Todo[]) => Todo[]) {
    const selectedId = this.selectedListId();

    this.lists.update((lists) =>
      lists.map((list) =>
        list.id === selectedId
          ? { ...list, todos: updater(list.todos ?? []) }
          : list
      )
    );
  }

  // ✅ ACTIONS (same as before, now scoped to selected list)
  addTodo(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;

    const normalized =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    const currentTodos = this.todos();

    const id = crypto.randomUUID();

    this.updateSelectedListTodos((prev) => [
      ...prev,
      {
        id: id,
        title: normalized,
        done: false,
        completedAt: null,
        priority: 'medium',
      },
    ]);
  }

  removeTodo(id: string) {
    this.updateSelectedListTodos((prev) => prev.filter((t) => t.id !== id));
  }

  toggleTodo(id: string) {
    this.updateSelectedListTodos((prev) =>
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

  editTodo(payload: { id: string; title: string }) {
    this.updateSelectedListTodos((prev) =>
      prev.map((t) =>
        t.id === payload.id ? { ...t, title: payload.title } : t
      )
    );
  }

  changePriority(payload: { id: string; priority: Priority }) {
    this.updateSelectedListTodos((prev) =>
      prev.map((t) =>
        t.id === payload.id ? { ...t, priority: payload.priority } : t
      )
    );
  }

  // * lists logic:

  createList(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const normalized =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    const id = crypto.randomUUID();

    this.lists.update((prev) => [
      ...prev,
      {
        id,
        name: normalized,
        todos: [],
      },
    ]);

    // auto-select the new list (nice UX)
    this.selectedListId.set(id);

    // optional: reset filter when switching lists
    this.filter.set('all');
  }

  selectList(id: string) {
    // only select if it exists
    const exists = this.lists().some((l) => l.id === id);
    if (!exists) return;

    this.selectedListId.set(id);

    // optional: reset filter when switching lists
    this.filter.set('all');
  }

  deleteList(id: string) {
    const lists = this.lists();

    // ❌ Do not allow deleting the last remaining list
    if (lists.length <= 1) return;

    const remaining = lists.filter((l) => l.id !== id);

    this.lists.set(remaining);

    // If we deleted the selected list, select another one
    if (this.selectedListId() === id) {
      this.selectedListId.set(remaining[0].id);
    }

    // Optional: reset filter
    this.filter.set('all');
  }
}
