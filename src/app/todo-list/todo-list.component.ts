import { Component, signal } from '@angular/core';
import { Todo } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  // Signal holding the list of todos.
  todos = signal<Todo[]>([
    { id: 1, title: 'take out trash', done: false },
    { id: 2, title: 'study for exams', done: false },
  ]);

  newTitle = signal('');

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
}
