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
import { WebhooksAdminComponent } from './components/webhooks/webhooks-admin.component';
import { VersionsAdminComponent } from './components/versions/versions-admin.component';
import { DynamicZoneComponent } from './components/dynamic-zone/dynamic-zone.component';
import { GraphQLPlaygroundComponent } from './components/graphql/graphql-playground.component';
import { GraphQLVoyagerComponent } from './components/graphql/graphql-voyager.component';
import { SingleTypesListComponent } from './components/single-types/single-types-list.component';
import { SingleTypeBuilderComponent } from './components/single-types/single-type-builder.component';
import { SingleTypeEditorComponent } from './components/single-types/single-type-editor.component';
import { ApiKeysListComponent } from './components/api-keys/api-keys-list.component';

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
      { path: 'single-types', component: SingleTypesListComponent },
      { path: 'single-types/builder', component: SingleTypeBuilderComponent },
      { path: 'single-types/builder/:id', component: SingleTypeBuilderComponent },
      { path: 'single-types/:apiId/content', component: SingleTypeEditorComponent },
      { path: 'media', component: MediaLibraryComponent },
      { path: 'api-docs', component: SwaggerViewerComponent },
      { path: 'graphql', component: GraphQLPlaygroundComponent },
      { path: 'voyager', component: GraphQLVoyagerComponent },
      { path: 'users', component: UsersListComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'webhooks', component: WebhooksAdminComponent },
      { path: 'versions', component: VersionsAdminComponent },
      { path: 'components', component: DynamicZoneComponent },
      { path: 'api-keys', component: ApiKeysListComponent },
      { path: 'swagger', redirectTo: 'api-docs', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
