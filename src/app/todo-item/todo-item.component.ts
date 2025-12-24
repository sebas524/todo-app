import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Priority, Todo } from '../interface/todo.interface';

@Component({
  selector: 'app-todo-item',
  imports: [],
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.css',
})
export class TodoItemComponent {
  todo = input.required<Todo>();
  editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  toggled = output<number>();
  removed = output<number>();
  edited = output<{ id: number; title: string }>();
  priorityChanged = output<{ id: number; priority: Priority }>();

  isEditing = signal(false);
  draftTitle = '';

  onToggle() {
    this.toggled.emit(this.todo()!.id);
  }

  onRemove() {
    this.removed.emit(this.todo()!.id);
  }

  startEdit() {
    this.isEditing.set(true);
    this.draftTitle = this.todo().title;

    setTimeout(() => {
      const el = this.editInput()?.nativeElement;
      el?.focus();
      el?.select();
    }, 0);
  }
  saveEdit() {
    const trimmed = this.draftTitle.trim();
    if (!trimmed) {
      this.cancelEdit();
      return;
    }

    this.edited.emit({ id: this.todo().id, title: trimmed });
    this.isEditing.set(false);
  }
  cancelEdit() {
    this.isEditing.set(false);
    this.draftTitle = '';
  }

  onPriorityChange(value: string) {
    // runtime guard (keeps it safe)
    if (value === 'high' || value === 'medium' || value === 'low') {
      this.priorityChanged.emit({ id: this.todo().id, priority: value });
    }
  }
}
