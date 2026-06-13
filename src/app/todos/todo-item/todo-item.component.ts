import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Priority, Todo } from '../interface/todo.interface';
import {
  AgentHighlightTone,
  AgentTodoHighlightPart,
} from '../services/agent-activity.service';

@Component({
  selector: 'app-todo-item',
  imports: [],
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.css',
})
export class TodoItemComponent {
  todo = input.required<Todo>();
  highlighted = input(false);
  highlightPart = input<AgentTodoHighlightPart | null>(null);
  highlightTone = input<AgentHighlightTone | null>(null);
  agentEditValue = input<string | null>(null);
  agentEditInputHighlighted = input(false);
  agentEditButtonHighlighted = input(false);
  agentEditTone = input<AgentHighlightTone | null>(null);
  editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  toggled = output<string>();
  removed = output<string>();
  edited = output<{ id: string; title: string }>();
  priorityChanged = output<{ id: string; priority: Priority }>();

  isEditing = signal(false);
  draftTitle = '';

  isPartHighlighted(part: AgentTodoHighlightPart) {
    return this.highlighted() && this.highlightPart() === part;
  }

  isTone(part: AgentTodoHighlightPart, tone: AgentHighlightTone) {
    return this.isPartHighlighted(part) && this.highlightTone() === tone;
  }

  isDisplayEditing() {
    return this.isEditing() || this.agentEditValue() !== null;
  }

  displayDraftTitle() {
    return this.agentEditValue() ?? this.draftTitle;
  }

  isEditActionActive() {
    return this.isEditing() || this.agentEditValue() !== null;
  }

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
