import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { HomeComponent } from './components/home.component';
import { authGuard } from './auth/auth.guard';
import { PageAComponent } from './components/page-a.component';
import { PageBComponent } from './components/page-b.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'page-a', pathMatch: 'full' },
      { path: 'page-a', component: PageAComponent },
      { path: 'page-b', component: PageBComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
