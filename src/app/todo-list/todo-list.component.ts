import { Component, computed, effect, signal } from '@angular/core';
import { Priority, Todo } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  private readonly STORAGE_KEY = 'todos_v1';

  private readonly priorityRank: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  todos = signal<Todo[]>([
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

  newTitle = signal('');

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);

    if (saved) {
      this.todos.set(JSON.parse(saved));
    }

    effect(() => {
      const currentTodos = this.todos();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentTodos));
    });
  }

  addTodo(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.newTitle.set(trimmed);

    const nextId = this.todos().length
      ? Math.max(
          ...this.todos().map((todo) => {
            return todo.id;
          })
        ) + 1
      : 1;

    // * Add new todo:

    this.todos.update((prevTodos) => {
      return [
        ...prevTodos,
        {
          id: nextId,
          title: trimmed,
          done: false,
          completedAt: null,
          priority: 'medium',
        },
      ];
    });

    console.log('value of newTitle', this.newTitle());
    console.log('todos', this.todos());

    // * Clear the input box AFTER adding the todo
    this.newTitle.set(''); // * signal reset
  }
  handleRemove(id: number) {
    this.todos.update((todos) => {
      return todos.filter((todo) => {
        return todo.id !== id;
      });
    });
  }
  handleToggle(id: number) {
    this.todos.update((todos) =>
      todos.map((todo) => {
        if (todo.id !== id) return todo;

        const nextDone = !todo.done;

        return {
          ...todo,
          done: nextDone,
          completedAt: nextDone ? Date.now() : null,
        };
      })
    );
  }

  handleEdit(payload: { id: number; title: string }) {
    this.todos.update((todos) => {
      return todos.map((todo) => {
        return todo.id === payload.id
          ? { ...todo, title: payload.title }
          : todo;
      });
    });
  }

  sortedTodos = computed(() => {
    const list = this.todos();

    const active = list
      .filter((t) => !t.done)
      .sort(
        (a, b) => this.priorityRank[a.priority] - this.priorityRank[b.priority]
      );
    // done items ordered by completion time (oldest first, newest last)
    const done = list
      .filter((t) => t.done)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));

    return [...active, ...done];
  });

  handlePriorityChange(payload: { id: number; priority: Priority }) {
    this.todos.update((todos) =>
      todos.map((todo) =>
        todo.id === payload.id ? { ...todo, priority: payload.priority } : todo
      )
    );
  }
}
