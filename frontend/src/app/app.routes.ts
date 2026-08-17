import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superAdminGuard } from './core/guards/superadmin.guard';
import { adminAreaGuard } from './core/guards/admin-area.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'tests',
    loadComponent: () =>
      import('./features/tests/test-runner/test-runner').then((m) => m.TestRunner),
  },
  {
    path: 'tests/random',
    loadComponent: () =>
      import('./features/tests/random/random').then((m) => m.RandomTest),
  },
  {
    path: 'tests/all',
    loadComponent: () =>
      import('./features/tests/all-tests/all-tests').then((m) => m.AllTests),
  },
  {
    path: 'tests/tickets',
    loadComponent: () =>
      import('./features/tests/tickets-list/tickets-list').then((m) => m.TicketsList),
  },
  {
    path: 'tests/tickets/:number',
    loadComponent: () =>
      import('./features/tests/ticket-session/ticket-session').then((m) => m.TicketSession),
  },
  {
    path: 'tests/topics',
    loadComponent: () =>
      import('./features/tests/topics-list/topics-list').then((m) => m.TopicsList),
  },
  {
    path: 'tests/topics/:topicId',
    loadComponent: () =>
      import('./features/tests/topic-session/topic-session').then((m) => m.TopicSession),
  },
  {
    path: 'tests/mistakes',
    loadComponent: () =>
      import('./features/tests/mistakes/mistakes').then((m) => m.Mistakes),
  },
  {
    path: 'tests/saved',
    loadComponent: () =>
      import('./features/tests/saved/saved').then((m) => m.Saved),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/progress/progress').then((m) => m.ProgressPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminAreaGuard],
    loadComponent: () =>
      import('./features/admin/admin-overview/admin-overview').then((m) => m.AdminOverview),
  },
  {
    path: 'admin/messages',
    canActivate: [authGuard, adminAreaGuard],
    loadComponent: () =>
      import('./features/admin/admin-messages/admin-messages').then((m) => m.AdminMessages),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin-users/admin-users').then((m) => m.AdminUsers),
  },
  {
    path: 'admin/topics',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin-topics/admin-topics').then((m) => m.AdminTopics),
  },
  {
    path: 'admin/questions',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin-questions/admin-questions').then((m) => m.AdminQuestions),
  },
  {
    path: 'admin/questions/new',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin-question-form/admin-question-form').then(
        (m) => m.AdminQuestionForm,
      ),
  },
  {
    path: 'admin/questions/:id/edit',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin/admin-question-form/admin-question-form').then(
        (m) => m.AdminQuestionForm,
      ),
  },
];
