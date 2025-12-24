import { Component, computed, effect, signal } from '@angular/core';
import { Todo } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  private readonly STORAGE_KEY = 'todos_v1';

  todos = signal<Todo[]>([
    { id: 1, title: 'take out trash', done: false },
    { id: 2, title: 'study for exams', done: false },
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
      return [...prevTodos, { id: nextId, title: trimmed, done: false }];
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
    this.todos.update((todos) => {
      return todos.map((todo) => {
        if (todo.id === id) {
          const updatedTodo = { ...todo, done: !todo.done };
          // console.log('Before:', todo);
          // console.log('After:', updatedTodo);

          return updatedTodo;
        }
        return todo;
      });
    });
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

    return [...list].sort((a, b) => {
      return Number(a.done) - Number(b.done);
    });
  });
}
