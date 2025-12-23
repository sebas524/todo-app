import { Component, input, output } from '@angular/core';
import { Todo } from '../interface/todo.interface';

@Component({
  selector: 'app-todo-item',
  imports: [],
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.css',
})
export class TodoItemComponent {
  todo = input.required<Todo>();

  toggled = output<number>();
  removed = output<number>();

  onToggle() {
    this.toggled.emit(this.todo()!.id);
  }

  onRemove() {
    this.removed.emit(this.todo()!.id);
  }
}
