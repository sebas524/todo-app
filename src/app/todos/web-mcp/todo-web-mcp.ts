import {
  TodoActionResult,
  TodoStoreService,
} from '../services/todo-store.service';
import {
  AgentActivityService,
  AgentTodoHighlightPart,
} from '../services/agent-activity.service';
import { Priority, Todo, TodoList } from '../interface/todo.interface';

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => unknown | Promise<unknown>;
  annotations?: Record<string, unknown>;
};

type WebMcpNavigator = Navigator & {
  modelContext?: {
    registerTool: (
      tool: WebMcpTool,
      options?: { signal?: AbortSignal },
    ) => void;
  };
};

type TodoMatch = {
  todo: Todo;
  list: TodoList;
};

const stringSchema = { type: 'string' };

export function registerTodoWebMcpTools(
  store: TodoStoreService,
  agentActivity: AgentActivityService,
): () => void {
  const modelContext = (navigator as WebMcpNavigator).modelContext;

  if (!modelContext?.registerTool) {
    return () => undefined;
  }

  const controller = new AbortController();
  const register = (tool: WebMcpTool) => {
    modelContext.registerTool(tool, { signal: controller.signal });
  };

  register({
    name: 'getLists',
    description:
      'Read-only discovery tool. Returns every todo list with its id, name, todo count, and whether it is currently selected. Use this before selecting or deleting a list when you only know the visible list name.',
    inputSchema: objectSchema({}, []),
    execute: () => ({
      ok: true,
      message: 'Todo lists loaded.',
      data: {
        selectedListId: store.selectedListId(),
        lists: store.lists().map((list) => ({
          id: list.id,
          name: list.name,
          todoCount: list.todos.length,
          selected: list.id === store.selectedListId(),
        })),
      },
    }),
    annotations: readOnlyAnnotations(),
  });

  register({
    name: 'getTodos',
    description:
      'Read-only discovery tool. Returns all todo lists and todos with exact ids, titles, completion state, priority, and owning list. Use this before editing, toggling, changing priority, or deleting a todo when the user describes it in natural language or you need the exact id/title.',
    inputSchema: objectSchema({}, []),
    execute: () => ({
      ok: true,
      message: 'Todos loaded.',
      data: {
        selectedListId: store.selectedListId(),
        selectedListName: store.selectedList()?.name ?? null,
        lists: serializeLists(store.lists(), store.selectedListId()),
      },
    }),
    annotations: readOnlyAnnotations(),
  });

  register({
    name: 'createList',
    description:
      'Create a new todo list and select it so the user can see the new list become active.',
    inputSchema: objectSchema(
      {
        name: {
          ...stringSchema,
          description: 'The name for the new todo list.',
        },
      },
      ['name'],
    ),
    execute: (input) => {
      const name = getStringInput(input, 'name');
      if (!name) return failure('List name is required.');

      const result = store.createList(name);
      if (!result.ok || !result.data) {
        agentActivity.showSnackbar(
          `Agent createList failed: ${result.message}`,
        );
        return result;
      }

      const list = result.data;
      store.selectList(list.id);
      agentActivity.showSnackbar(
        `Agent createList completed: created and selected "${list.name}".`,
      );
      agentActivity.highlight({
        type: 'selected-list',
        part: 'title',
        tone: 'success',
      });

      return {
        ok: true,
        message: `Created and selected list: ${list.name}`,
        data: list,
      };
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'selectList',
    description:
      'Select an existing todo list before adding new todos in that list. Use either the exact list id or exact visible list name. Use getLists first when you need to discover available lists.',
    inputSchema: objectSchema(
      {
        id: {
          ...stringSchema,
          description: 'The id of the todo list to select, if known.',
        },
        name: {
          ...stringSchema,
          description: 'The exact visible name of the todo list to select.',
        },
      },
      [],
    ),
    execute: (input) => {
      const list = findListFromInput(store, input);
      if (!list) return failure('List not found.');

      const result = store.selectList(list.id);
      agentActivity.showSnackbar(
        result.ok
          ? `Agent selectList completed: selected "${result.data?.name}".`
          : `Agent selectList failed: ${result.message}`,
      );
      if (result.ok) {
        agentActivity.highlight({ type: 'selected-list', part: 'selector' });
      }

      return result;
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'deleteList',
    description:
      'Delete an entire todo list/category and all todos inside it. Use this only when the user asks to delete a list itself, such as "delete the Work list". Use getLists first when you need to identify the correct list from visible content. For deleting one todo item, use deleteTodo instead.',
    inputSchema: objectSchema(
      {
        id: {
          ...stringSchema,
          description: 'The id of the todo list to delete, if known.',
        },
        name: {
          ...stringSchema,
          description: 'The exact visible name of the todo list to delete.',
        },
      },
      [],
    ),
    execute: async (input) => {
      const list = findListFromInput(store, input);
      if (!list) return failure('List not found.');

      if (store.selectedListId() !== list.id) {
        const selectResult = store.selectList(list.id);
        if (!selectResult.ok) return failure(selectResult.message);

        agentActivity.showSnackbar(
          `Agent selected "${list.name}" before deleting it.`,
          5000,
        );
        agentActivity.highlight({ type: 'selected-list', part: 'selector' });
        await waitForAgentStep(1800);
      }

      agentActivity.highlight({
        type: 'selected-list',
        part: 'title',
        tone: 'info',
      });
      await waitForAgentStep(1400);

      const confirmed = await agentActivity.requestConfirmation({
        title: 'Agent requested list deletion',
        message: `Delete "${list.name}" and all of its todos?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      });

      if (!confirmed) {
        return failure('Delete canceled.');
      }

      agentActivity.highlight({
        type: 'selected-list',
        part: 'title',
        tone: 'danger',
      });
      await waitForAgentStep(1600);

      const result = store.deleteList(list.id);
      agentActivity.showSnackbar(
        result.ok
          ? `Agent deleteList completed: deleted "${list.name}".`
          : `Agent deleteList failed: ${result.message}`,
      );

      return result;
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'addTodo',
    description: 'Add a todo to the currently selected todo list.',
    inputSchema: objectSchema(
      {
        title: {
          ...stringSchema,
          description: 'The todo title to add.',
        },
      },
      ['title'],
    ),
    execute: (input) => {
      const title = getStringInput(input, 'title');
      if (!title) return failure('Todo title is required.');

      const result = store.addTodo(title);
      if (result.ok && result.data) {
        agentActivity.showSnackbar(
          `Agent addTodo completed: added "${result.data.title}".`,
        );
        agentActivity.highlight({
          type: 'todo',
          id: result.data.id,
          part: 'title',
          tone: 'success',
        });
      } else {
        agentActivity.showSnackbar(`Agent addTodo failed: ${result.message}`);
      }

      return result;
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'deleteTodo',
    description:
      'Delete one existing todo item. Use this when the user asks to delete, remove, or get rid of a task/todo such as "delete Call bosch clients". Use getTodos first when the user describes the todo in natural language and you need the exact id/title. The tool can find the todo across all lists, select the owning list for the user, and then ask for confirmation before deleting.',
    inputSchema: todoLookupSchema(
      'The id of the todo to delete, if known.',
      'The exact visible title of the todo to delete.',
    ),
    execute: (input) => deleteTodoAcrossLists(store, agentActivity, input),
    annotations: writableAnnotations(),
  });

  register({
    name: 'editTodo',
    description:
      'Edit the title of one existing todo item. Use getTodos first when the user describes the todo in natural language and you need the exact id/title. The tool can find the todo across all lists, select the owning list for the user, highlight it, and then edit it.',
    inputSchema: objectSchema(
      {
        id: {
          ...stringSchema,
          description: 'The id of the todo to edit, if known.',
        },
        currentTitle: {
          ...stringSchema,
          description:
            'The exact current visible title of the todo to edit, if the id is unknown.',
        },
        todoTitle: {
          ...stringSchema,
          description:
            'Another name for the exact current visible title of the todo to edit.',
        },
        listId: {
          ...stringSchema,
          description:
            'The id of the list containing the todo, if needed to disambiguate.',
        },
        listName: {
          ...stringSchema,
          description:
            'The exact visible name of the list containing the todo, if needed to disambiguate.',
        },
        title: {
          ...stringSchema,
          description: 'The new todo title.',
        },
      },
      ['title'],
    ),
    execute: async (input) => {
      const title = getStringInput(input, 'title');
      if (!title) return failure('Todo title is required.');

      const matchResult = await prepareTodoMatch(store, agentActivity, input, [
        'currentTitle',
        'todoTitle',
      ], 'edit');
      if (!matchResult.ok || !matchResult.data) return matchResult;

      const { todo, list } = matchResult.data;
      agentActivity.highlight({
        type: 'todo',
        id: todo.id,
        part: 'edit',
        tone: 'success',
      });
      await waitForAgentStep(1400);

      const result = store.editTodo({ id: todo.id, title });
      if (result.ok && result.data) {
        agentActivity.showSnackbar(
          `Agent editTodo completed: changed "${todo.title}" to "${result.data.title}" in "${list.name}".`,
        );
        agentActivity.highlight({
          type: 'todo',
          id: result.data.id,
          part: 'edit',
          tone: 'success',
        });
      } else {
        agentActivity.showSnackbar(`Agent editTodo failed: ${result.message}`);
      }

      return result;
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'toggleTodo',
    description:
      'Toggle one existing todo between active and done. Use getTodos first when the user describes the todo in natural language, for example "I finished taking out the trash", so you can identify the exact existing todo id/title. The tool can find the todo across all lists, select the owning list for the user, highlight it, and then toggle it.',
    inputSchema: todoLookupSchema(
      'The id of the todo to toggle, if known.',
      'The exact visible title of the todo to toggle.',
    ),
    execute: async (input) => {
      const matchResult = await prepareTodoMatch(
        store,
        agentActivity,
        input,
        ['title'],
        'toggle',
      );
      if (!matchResult.ok || !matchResult.data) return matchResult;

      const { todo, list } = matchResult.data;
      agentActivity.highlight({
        type: 'todo',
        id: todo.id,
        part: 'toggle',
        tone: 'success',
      });
      await waitForAgentStep(1400);

      const result = store.toggleTodo(todo.id);
      if (result.ok && result.data) {
        agentActivity.showSnackbar(
          `Agent toggleTodo completed in "${list.name}": ${result.message}.`,
        );
        agentActivity.highlight({
          type: 'todo',
          id: result.data.id,
          part: 'toggle',
          tone: 'success',
        });
      } else {
        agentActivity.showSnackbar(
          `Agent toggleTodo failed: ${result.message}`,
        );
      }

      return result;
    },
    annotations: writableAnnotations(),
  });

  register({
    name: 'changeTodoPriority',
    description:
      'Change the priority of one existing todo. Use getTodos first when the user describes the todo in natural language and you need the exact id/title. The tool can find the todo across all lists, select the owning list for the user, highlight the priority dropdown, and then change the priority.',
    inputSchema: objectSchema(
      {
        id: {
          ...stringSchema,
          description: 'The id of the todo to update, if known.',
        },
        title: {
          ...stringSchema,
          description: 'The exact visible title of the todo to update.',
        },
        listId: {
          ...stringSchema,
          description:
            'The id of the list containing the todo, if needed to disambiguate.',
        },
        listName: {
          ...stringSchema,
          description:
            'The exact visible name of the list containing the todo, if needed to disambiguate.',
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description:
            'The new priority. Use high for urgent tasks, medium for normal tasks, and low for less important tasks.',
        },
      },
      ['priority'],
    ),
    execute: async (input) => {
      const priority = getPriorityInput(input);
      if (!priority) return failure('Priority must be high, medium, or low.');

      const matchResult = await prepareTodoMatch(
        store,
        agentActivity,
        input,
        ['title'],
        'priority',
      );
      if (!matchResult.ok || !matchResult.data) return matchResult;

      const { todo, list } = matchResult.data;
      agentActivity.highlight({
        type: 'todo',
        id: todo.id,
        part: 'priority',
        tone: 'success',
      });
      await waitForAgentStep(1400);

      store.changePriority({ id: todo.id, priority });
      const updatedTodo: Todo = { ...todo, priority };
      agentActivity.showSnackbar(
        `Agent changeTodoPriority completed: set "${todo.title}" to ${priority} in "${list.name}".`,
      );
      agentActivity.highlight({
        type: 'todo',
        id: todo.id,
        part: 'priority',
        tone: 'success',
      });

      return success('Todo priority changed.', updatedTodo);
    },
    annotations: writableAnnotations(),
  });

  return () => controller.abort();
}

function objectSchema(properties: Record<string, unknown>, required: string[]) {
  return {
    type: 'object',
    properties,
    required,
  };
}

function todoLookupSchema(idDescription: string, titleDescription: string) {
  return objectSchema(
    {
      id: {
        ...stringSchema,
        description: idDescription,
      },
      title: {
        ...stringSchema,
        description: titleDescription,
      },
      listId: {
        ...stringSchema,
        description:
          'The id of the list containing the todo, if needed to disambiguate.',
      },
      listName: {
        ...stringSchema,
        description:
          'The exact visible name of the list containing the todo, if needed to disambiguate.',
      },
    },
    [],
  );
}

function writableAnnotations() {
  return { readOnlyHint: false, untrustedContentHint: false };
}

function readOnlyAnnotations() {
  return { readOnlyHint: true, untrustedContentHint: false };
}

function serializeLists(lists: TodoList[], selectedListId: string) {
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    selected: list.id === selectedListId,
    todoCount: list.todos.length,
    todos: list.todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      done: todo.done,
      completedAt: todo.completedAt,
      priority: todo.priority,
      listId: list.id,
      listName: list.name,
    })),
  }));
}

function getStringInput(input: unknown, key: string) {
  if (!isRecord(input)) return null;
  const value = input[key];
  return typeof value === 'string' ? value.trim() : null;
}

function getPriorityInput(input: unknown): Priority | null {
  const priority = getStringInput(input, 'priority');
  if (priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority;
  }

  return null;
}

function findListByIdentity(
  store: TodoStoreService,
  id: string | null,
  name: string | null,
) {
  const lists = store.lists();

  if (id) {
    const exactIdMatch = lists.find((list) => list.id === id);
    if (exactIdMatch) return exactIdMatch;
  }

  const requestedName = name ?? id;
  if (!requestedName) return null;

  return (
    lists.find(
      (list) => list.name.toLowerCase() === requestedName.toLowerCase(),
    ) ?? null
  );
}

function findListFromInput(store: TodoStoreService, input: unknown) {
  return findListByIdentity(
    store,
    getStringInput(input, 'id'),
    getStringInput(input, 'name'),
  );
}

function resolveTodoFromInput(
  store: TodoStoreService,
  input: unknown,
  titleKeys = ['title'],
): TodoActionResult<TodoMatch> {
  const id = getStringInput(input, 'id');
  const list = findListByIdentity(
    store,
    getStringInput(input, 'listId'),
    getStringInput(input, 'listName'),
  );
  const listWasRequested =
    !!getStringInput(input, 'listId') || !!getStringInput(input, 'listName');

  if (listWasRequested && !list) {
    return failure('List not found.');
  }

  const lists = list ? [list] : store.lists();

  if (id) {
    for (const candidateList of lists) {
      const todo = candidateList.todos.find((item) => item.id === id);
      if (todo) return success('Todo found.', { todo, list: candidateList });
    }
  }

  const requestedTitle = getFirstStringInput(input, titleKeys) ?? id;
  if (!requestedTitle) {
    return failure('Todo id or visible title is required.');
  }

  const matches = lists.flatMap((candidateList) =>
    candidateList.todos
      .filter(
        (todo) => todo.title.toLowerCase() === requestedTitle.toLowerCase(),
      )
      .map((todo) => ({ todo, list: candidateList })),
  );

  if (matches.length === 0) {
    return failure(
      list
        ? `Todo not found in "${list.name}".`
        : 'Todo not found in any list.',
    );
  }

  if (matches.length > 1) {
    const listNames = matches.map((match) => `"${match.list.name}"`).join(', ');
    return failure(
      `Multiple todos named "${requestedTitle}" found in ${listNames}. Please specify the list.`,
    );
  }

  return success('Todo found.', matches[0]);
}

async function prepareTodoMatch(
  store: TodoStoreService,
  agentActivity: AgentActivityService,
  input: unknown,
  titleKeys = ['title'],
  highlightPart: AgentTodoHighlightPart = 'title',
): Promise<TodoActionResult<TodoMatch>> {
  const matchResult = resolveTodoFromInput(store, input, titleKeys);
  if (!matchResult.ok || !matchResult.data) return matchResult;

  const { todo, list } = matchResult.data;
  if (store.selectedListId() !== list.id) {
    const selectResult = store.selectList(list.id);
    if (!selectResult.ok) return failure(selectResult.message);

    agentActivity.showSnackbar(
      `Agent selected "${list.name}" to work on "${todo.title}".`,
      5000,
    );
    agentActivity.highlight({ type: 'selected-list', part: 'selector' });
    await waitForAgentStep(2800);
  }

  agentActivity.highlight({
    type: 'todo',
    id: todo.id,
    part: highlightPart,
    tone: 'info',
  });
  await waitForAgentStep(2400);
  return matchResult;
}

async function deleteTodoAcrossLists(
  store: TodoStoreService,
  agentActivity: AgentActivityService,
  input: unknown,
) {
  const matchResult = await prepareTodoMatch(
    store,
    agentActivity,
    input,
    ['title'],
    'remove',
  );
  if (!matchResult.ok || !matchResult.data) return matchResult;

  const { todo, list } = matchResult.data;

  const confirmed = await agentActivity.requestConfirmation({
    title: 'Agent requested todo deletion',
    message: `Delete "${todo.title}" from "${list.name}"?`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    destructive: true,
  });

  if (!confirmed) {
    return failure('Delete canceled.');
  }

  agentActivity.highlight({
    type: 'todo',
    id: todo.id,
    part: 'remove',
    tone: 'danger',
  });
  await waitForAgentStep(1600);

  const result = store.removeTodo(todo.id);
  agentActivity.showSnackbar(
    result.ok
      ? `Agent deleteTodo completed: deleted "${todo.title}" from "${list.name}".`
      : `Agent deleteTodo failed: ${result.message}`,
  );

  return result;
}

function getFirstStringInput(input: unknown, keys: string[]) {
  for (const key of keys) {
    const value = getStringInput(input, key);
    if (value) return value;
  }

  return null;
}

function waitForAgentStep(durationMs = 900) {
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function success<T>(message: string, data: T): TodoActionResult<T> {
  return { ok: true, message, data };
}

function failure(message: string): TodoActionResult<never> {
  return { ok: false, message };
}
