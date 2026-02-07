import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GraphQLResponse } from '../models/graphql.model';

@Injectable({ providedIn: 'root' })
export class GraphQLService {
  private readonly graphqlUrl: string;

  constructor(private readonly http: HttpClient) {
    this.graphqlUrl = environment.apiUrl.replace('/api', '') + '/graphql';
  }

  getEndpointUrl(): string {
    return this.graphqlUrl;
  }

  getSdlUrl(): string {
    return this.graphqlUrl + '/sdl';
  }

  getPlaygroundUrl(): string {
    return this.graphqlUrl;
  }

  execute<T = any>(query: string, variables?: Record<string, any>): Observable<GraphQLResponse<T>> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<GraphQLResponse<T>>(this.graphqlUrl, { query, variables }, { headers });
  }

  generateCollectionQuery(collectionName: string, columns: { name: string }[]): string {
    const fields = columns.map(c => `    ${c.name}`).join('\n');
    return `query Get${this.pascalCase(collectionName)} {
  entries(collectionName: "${collectionName}") {
${fields}
  }
}`;
  }

  generateCollectionMutation(collectionName: string, type: 'create' | 'update'): string {
    if (type === 'create') {
      return `mutation Create${this.pascalCase(collectionName)}Entry($data: JSON!) {
  createEntry(collectionName: "${collectionName}", data: $data) {
    id
  }
}`;
    }
    return `mutation Update${this.pascalCase(collectionName)}Entry($id: Int!, $data: JSON!) {
  updateEntry(collectionName: "${collectionName}", id: $id, data: $data) {
    id
  }
}`;
  }

  generateSubscription(collectionName: string, event: 'created' | 'updated' | 'deleted'): string {
    const eventName = `entry${this.pascalCase(event)}`;
    return `subscription On${this.pascalCase(collectionName)}${this.pascalCase(event)} {
  ${eventName}(collectionName: "${collectionName}") {
    id
    createdAt
  }
}`;
  }

  private pascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }
}
