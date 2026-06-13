import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Priority } from '../interface/todo.interface';
import { TodoItemComponent } from '../todo-item/todo-item.component';
import { TodoStoreService } from '../services/todo-store.service';
import { TitleCasePipe } from '@angular/common';
import { InputBarWithButtonComponent } from '../components/input-bar-with-button/input-bar-with-button.component';
import { AgentActivityService } from '../services/agent-activity.service';
import { registerTodoWebMcpTools } from '../web-mcp/todo-web-mcp';

@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent, TitleCasePipe, InputBarWithButtonComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css',
})
export class TodoListComponent implements OnInit, OnDestroy {
  private readonly store = inject(TodoStoreService);
  readonly agentActivity = inject(AgentActivityService);
  private unregisterWebMcpTools: (() => void) | null = null;

  readonly filteredTodos = this.store.filteredTodos;

  readonly filter = this.store.filter;

  readonly lists = this.store.lists;
  readonly selectedListId = this.store.selectedListId;
  readonly selectedList = this.store.selectedList;

  isRenaming = signal(false);
  renameDraft = signal('');

  renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  ngOnInit() {
    this.unregisterWebMcpTools = registerTodoWebMcpTools(
      this.store,
      this.agentActivity
    );
  }

  ngOnDestroy() {
    this.unregisterWebMcpTools?.();
  }

  selectList(id: string) {
    this.store.selectList(id);
  }

  createList(name: string) {
    const result = this.store.createList(name);
    if (!result.ok || !result.data) return;

    // ✅ wait one tick so the new <option> exists, then select it
    setTimeout(() => {
      this.store.selectList(result.data!.id);
    }, 0);
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

  startRename() {
    const current = this.selectedList();
    if (!current) return;

    this.renameDraft.set(current.name);
    this.isRenaming.set(true);

    setTimeout(() => {
      const el = this.renameInput()?.nativeElement;
      if (!el) return;

      el.focus();
      // place caret at end
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
  }

  saveRename() {
    const list = this.selectedList();
    if (!list) return;

    const value = this.renameDraft().trim();
    if (!value) {
      this.cancelRename();
      return;
    }

    this.store.renameList(list.id, value);
    this.isRenaming.set(false);
  }

  cancelRename() {
    this.isRenaming.set(false);
    this.renameDraft.set('');
  }
}
