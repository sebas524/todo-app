import { Injectable, signal } from '@angular/core';

export type AgentHighlightTarget =
  | { type: 'list'; id: string; tone?: AgentHighlightTone }
  | { type: 'todo'; id: string; part?: AgentTodoHighlightPart; tone?: AgentHighlightTone }
  | { type: 'selected-list'; part?: AgentListHighlightPart; tone?: AgentHighlightTone };

export type AgentHighlightTone = 'info' | 'success' | 'danger';
export type AgentTodoHighlightPart =
  | 'title'
  | 'toggle'
  | 'priority'
  | 'edit'
  | 'remove';
export type AgentListHighlightPart = 'title' | 'selector';
export type AgentInputTarget =
  | { type: 'new-list' }
  | { type: 'new-todo' }
  | { type: 'edit-todo'; id: string };

export type AgentInputPlayback = {
  target: AgentInputTarget;
  value: string;
  highlightInput: boolean;
  highlightButton: boolean;
  tone: AgentHighlightTone;
};

export type AgentConfirmationState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
};

@Injectable({ providedIn: 'root' })
export class AgentActivityService {
  readonly snackbarMessage = signal<string | null>(null);
  readonly highlightTarget = signal<AgentHighlightTarget | null>(null);
  readonly confirmation = signal<AgentConfirmationState | null>(null);
  readonly inputPlayback = signal<AgentInputPlayback | null>(null);

  private snackbarTimer: ReturnType<typeof setTimeout> | null = null;
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmationResolver: ((confirmed: boolean) => void) | null = null;

  showSnackbar(message: string, durationMs = 6000) {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);

    this.snackbarMessage.set(message);
    this.snackbarTimer = setTimeout(() => {
      this.snackbarMessage.set(null);
      this.snackbarTimer = null;
    }, durationMs);
  }

  highlight(target: AgentHighlightTarget, durationMs = 2500) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);

    this.highlightTarget.set(target);
    this.highlightTimer = setTimeout(() => {
      this.highlightTarget.set(null);
      this.highlightTimer = null;
    }, durationMs);
  }

  isTodoHighlighted(id: string) {
    const target = this.highlightTarget();
    return target?.type === 'todo' && target.id === id;
  }

  todoHighlightTone(id: string): AgentHighlightTone | null {
    const target = this.highlightTarget();
    if (target?.type !== 'todo' || target.id !== id) return null;
    return target.tone ?? 'info';
  }

  todoHighlightPart(id: string): AgentTodoHighlightPart | null {
    const target = this.highlightTarget();
    if (target?.type !== 'todo' || target.id !== id) return null;
    return target.part ?? 'title';
  }

  isSelectedListHighlighted() {
    const target = this.highlightTarget();
    return target?.type === 'selected-list';
  }

  isSelectedListTitleHighlighted() {
    const target = this.highlightTarget();
    return (
      target?.type === 'selected-list' && (target.part ?? 'selector') === 'title'
    );
  }

  selectedListHighlightTone(): AgentHighlightTone | null {
    const target = this.highlightTarget();
    if (target?.type !== 'selected-list') return null;
    return target.tone ?? 'info';
  }

  isSelectedListSelectorHighlighted() {
    const target = this.highlightTarget();
    return (
      target?.type === 'selected-list' &&
      (target.part ?? 'selector') === 'selector'
    );
  }

  requestConfirmation(state: AgentConfirmationState): Promise<boolean> {
    if (this.confirmationResolver) {
      this.confirmationResolver(false);
    }

    this.confirmation.set(state);

    return new Promise((resolve) => {
      this.confirmationResolver = resolve;
    });
  }

  resolveConfirmation(confirmed: boolean) {
    this.confirmation.set(null);

    const resolver = this.confirmationResolver;
    this.confirmationResolver = null;
    resolver?.(confirmed);
  }

  showInputPlayback(playback: AgentInputPlayback) {
    this.inputPlayback.set(playback);
  }

  clearInputPlayback() {
    this.inputPlayback.set(null);
  }

  inputValue(target: AgentInputTarget) {
    const playback = this.inputPlayback();
    return playback && this.matchesInputTarget(playback.target, target)
      ? playback.value
      : null;
  }

  isInputHighlighted(target: AgentInputTarget) {
    const playback = this.inputPlayback();
    return (
      !!playback &&
      playback.highlightInput &&
      this.matchesInputTarget(playback.target, target)
    );
  }

  isButtonHighlighted(target: AgentInputTarget) {
    const playback = this.inputPlayback();
    return (
      !!playback &&
      playback.highlightButton &&
      this.matchesInputTarget(playback.target, target)
    );
  }

  inputTone(target: AgentInputTarget): AgentHighlightTone | null {
    const playback = this.inputPlayback();
    if (!playback || !this.matchesInputTarget(playback.target, target)) {
      return null;
    }

    return playback.tone;
  }

  private matchesInputTarget(a: AgentInputTarget, b: AgentInputTarget) {
    if (a.type !== b.type) return false;
    if (a.type !== 'edit-todo' || b.type !== 'edit-todo') return true;
    return a.id === b.id;
  }
}
