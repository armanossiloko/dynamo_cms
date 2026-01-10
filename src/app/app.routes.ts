import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { HomeComponent } from './components/home.component';
import { authGuard } from './auth/auth.guard';
import { CollectionsListComponent } from './components/collections/collections-list.component';
import { DataListComponent } from './components/data/data-list.component';
import { MediaLibraryComponent } from './components/media/media-library.component';
import { SwaggerViewerComponent } from './components/swagger/swagger-viewer.component';
import { RegisterComponent } from './components/register.component';
import { UsersListComponent } from './components/users/users-list.component';
import { UserDetailComponent } from './components/users/user-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'collections', pathMatch: 'full' },
      { path: 'collections', component: CollectionsListComponent },
      { path: 'data/:collectionName', component: DataListComponent },
      { path: 'media', component: MediaLibraryComponent },
      { path: 'swagger', component: SwaggerViewerComponent },
      { path: 'users', component: UsersListComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'register', component: RegisterComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
