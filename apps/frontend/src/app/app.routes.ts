import { Routes } from '@angular/router';
import { Login } from './components/login';
import { Home } from './components/home';
import { authGuard } from './auth/auth.guard';
import { CollectionsList } from './components/collections/collections-list';
import { DataList } from './components/data/data-list';
import { MediaLibrary } from './components/media/media-library';
import { ApiDocs } from './components/api-docs/api-docs';
import { SwaggerViewer } from './components/swagger/swagger-viewer';
import { UsersList } from './components/users/users-list';
import { UserDetail } from './components/users/user-detail';
import { WebhooksAdmin } from './components/webhooks/webhooks-admin';
import { VersionsAdmin } from './components/versions/versions-admin';
import { ComponentsAdmin } from './components/components/components-admin';
import { GraphQLPlayground } from './components/graphql/graphql-playground';
import { GraphQLVoyager } from './components/graphql/graphql-voyager';
import { SingleTypesList } from './components/single-types/single-types-list';
import { SingleTypeBuilder } from './components/single-types/single-type-builder';
import { SingleTypeEditor } from './components/single-types/single-type-editor';
import { ApiKeysList } from './components/api-keys/api-keys-list';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'collections', pathMatch: 'full' },
      { path: 'collections', component: CollectionsList },
      { path: 'data/:collectionName', component: DataList },
      { path: 'single-types', component: SingleTypesList },
      { path: 'single-types/builder', component: SingleTypeBuilder },
      { path: 'single-types/builder/:id', component: SingleTypeBuilder },
      { path: 'single-types/:apiId/content', component: SingleTypeEditor },
      { path: 'media', component: MediaLibrary },
      { path: 'api-docs', component: SwaggerViewer },
      { path: 'api-reference', component: ApiDocs },
      { path: 'graphql', component: GraphQLPlayground },
      { path: 'voyager', component: GraphQLVoyager },
      { path: 'users', component: UsersList },
      { path: 'users/:id', component: UserDetail },
      { path: 'register', redirectTo: 'users', pathMatch: 'full' },
      { path: 'webhooks', component: WebhooksAdmin },
      { path: 'versions', component: VersionsAdmin },
      { path: 'components', component: ComponentsAdmin },
      { path: 'api-keys', component: ApiKeysList },
      { path: 'swagger', redirectTo: 'api-docs', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
