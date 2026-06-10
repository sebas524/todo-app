import { TestBed } from '@angular/core/testing';

import { TodoStoreService } from './todo-store.service';
import { TodoList } from '../interface/todo.interface';

describe('TodoStoreService', () => {
  let service: TodoStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a todo to the selected list and return it', () => {
    const result = service.addTodo('study angular');

    expect(result.ok).toBeTrue();
    expect(result.data?.title).toBe('Study angular');
    expect(service.todos()).toContain(result.data!);
  });

  it('should select a list and then add todos to that list', () => {
    const workList = service.createList('work');
    expect(workList.ok).toBeTrue();

    service.selectList(workList.data!.id);
    const todo = service.addTodo('send report');

    expect(todo.ok).toBeTrue();
    expect(service.selectedList()?.id).toBe(workList.data!.id);
    expect(service.selectedList()?.todos).toContain(todo.data!);
  });

  it('should edit, toggle, and remove a todo in the selected list', () => {
    const todo = service.addTodo('draft notes').data!;

    const edited = service.editTodo({ id: todo.id, title: 'final notes' });
    expect(edited.ok).toBeTrue();
    expect(edited.data?.title).toBe('final notes');

    const toggled = service.toggleTodo(todo.id);
    expect(toggled.ok).toBeTrue();
    expect(toggled.data?.done).toBeTrue();

    const removed = service.removeTodo(todo.id);
    expect(removed.ok).toBeTrue();
    expect(service.todos().some((item) => item.id === todo.id)).toBeFalse();
  });

  it('should fail when editing, toggling, or removing an unknown todo', () => {
    expect(service.editTodo({ id: 'missing', title: 'Nope' }).ok).toBeFalse();
    expect(service.toggleTodo('missing').ok).toBeFalse();
    expect(service.removeTodo('missing').ok).toBeFalse();
  });

  it('should fail when selecting an unknown list', () => {
    const result = service.selectList('missing');

    expect(result.ok).toBeFalse();
    expect(service.selectedListId()).toBe('default');
  });

  it('should fail when deleting the final remaining list', () => {
    const result = service.deleteList('default');

    expect(result.ok).toBeFalse();
    expect(service.lists().length).toBe(1);
  });

  it('should delete an existing list when more than one list exists', () => {
    const extraList = service.createList('extra').data as TodoList;

    const result = service.deleteList(extraList.id);

    expect(result.ok).toBeTrue();
    expect(service.lists().some((list) => list.id === extraList.id)).toBeFalse();
  });
});
