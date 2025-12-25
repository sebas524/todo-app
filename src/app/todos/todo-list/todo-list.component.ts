import { Component, inject } from '@angular/core';
import { Priority } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';
import { TodoStoreService } from '../services/todo-store.service';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent, TitleCasePipe],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent {
  private readonly store = inject(TodoStoreService);

  readonly filteredTodos = this.store.filteredTodos;

  readonly filter = this.store.filter;

  readonly lists = this.store.lists;
  readonly selectedListId = this.store.selectedListId;
  readonly selectedList = this.store.selectedList;

  selectList(id: string) {
    this.store.selectList(id);
  }

  createList(name: string) {
    this.store.createList(name);
  }

  deleteList(id: string) {
    this.store.deleteList(id);
  }

  setFilter(f: 'all' | 'active' | 'done') {
    this.store.setFilter(f);
  }

  addTodo(title: string) {
    this.store.addTodo(title);
  }
  handleRemove(id: string) {
    this.store.removeTodo(id);
  }
  handleToggle(id: string) {
    this.store.toggleTodo(id);
  }

  handleEdit(payload: { id: string; title: string }) {
    this.store.editTodo(payload);
  }

  handlePriorityChange(payload: { id: string; priority: Priority }) {
    this.store.changePriority(payload);
  }

  confirm = window.confirm.bind(window);
}
