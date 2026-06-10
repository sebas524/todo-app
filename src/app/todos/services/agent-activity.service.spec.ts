import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AgentActivityService } from './agent-activity.service';

describe('AgentActivityService', () => {
  let service: AgentActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgentActivityService);
  });

  it('should show and auto-clear a snackbar message', fakeAsync(() => {
    service.showSnackbar('Agent added todo', 100);

    expect(service.snackbarMessage()).toBe('Agent added todo');

    tick(100);

    expect(service.snackbarMessage()).toBeNull();
  }));

  it('should highlight and auto-clear a target', fakeAsync(() => {
    service.highlight({ type: 'todo', id: 'todo-1' }, 100);

    expect(service.isTodoHighlighted('todo-1')).toBeTrue();

    tick(100);

    expect(service.highlightTarget()).toBeNull();
  }));

  it('should resolve confirmation as true', async () => {
    const promise = service.requestConfirmation({
      title: 'Delete todo?',
      message: 'Delete this todo?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });

    service.resolveConfirmation(true);

    await expectAsync(promise).toBeResolvedTo(true);
    expect(service.confirmation()).toBeNull();
  });

  it('should resolve confirmation as false', async () => {
    const promise = service.requestConfirmation({
      title: 'Delete todo?',
      message: 'Delete this todo?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });

    service.resolveConfirmation(false);

    await expectAsync(promise).toBeResolvedTo(false);
    expect(service.confirmation()).toBeNull();
  });
});
