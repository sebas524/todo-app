import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { TodoListComponent } from './todos/todo-list/todo-list.component';
import { authGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'todos', component: TodoListComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'todos', pathMatch: 'full' },
  { path: '**', redirectTo: 'todos' },
];
