import { Component, computed, effect, inject, signal } from '@angular/core';
import { Priority, Todo } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';
import { TodoStoreService } from '../services/todo-store.service';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  private readonly store = inject(TodoStoreService);

  // expose derived list to template (same name your template uses)
  readonly sortedTodos = this.store.sortedTodos;

  addTodo(title: string) {
    this.store.addTodo(title);
  }
  handleRemove(id: number) {
    this.store.removeTodo(id);
  }
  handleToggle(id: number) {
    this.store.toggleTodo(id);
  }

  handleEdit(payload: { id: number; title: string }) {
    this.store.editTodo(payload);
  }

  handlePriorityChange(payload: { id: number; priority: Priority }) {
    this.store.changePriority(payload);
  }
}
