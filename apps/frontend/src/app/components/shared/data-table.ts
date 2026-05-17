import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead class="bg-bg-tertiary">
          <tr>
            @for (column of columns(); track column.key) {
              <th class="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-primary">
                {{ column.label }}
              </th>
            }
            @if (showActions()) {
              <th class="px-4 py-2 text-left text-sm font-semibold text-text-primary border-b border-border-primary">Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td [colSpan]="columns().length + (showActions() ? 1 : 0)" class="px-4 py-8 text-center text-text-muted">
                Loading...
              </td>
            </tr>
          } @else if (data().length === 0) {
            <tr>
              <td [colSpan]="columns().length + (showActions() ? 1 : 0)" class="px-4 py-8 text-center text-text-muted">
                No data available
              </td>
            </tr>
          } @else {
            @for (row of data(); track getRowId(row)) {
              <tr class="border-b border-border-primary hover:bg-interactive-hover transition-colors">
                @for (column of columns(); track column.key) {
                  <td class="px-4 py-2 text-sm text-text-primary">
                    @if (column.type === 'link' && column.linkFn) {
                      <a [routerLink]="column.linkFn(row)" class="text-accent hover:underline">
                        {{ formatValue(row[column.key], column.type) }}
                      </a>
                    } @else {
                      {{ formatValue(row[column.key], column.type) }}
                    }
                  </td>
                }
                @if (showActions()) {
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-2">
                      <ng-content [ngTemplateOutlet]="actionTemplate" [ngTemplateOutletContext]="{ $implicit: row }"></ng-content>
                    </div>
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `
})
export class DataTable {
  @Input() data = signal<Record<string, any>[]>([]);
  @Input() columns = signal<TableColumn[]>([]);
  @Input() loading = signal<boolean>(false);
  @Input() showActions = signal<boolean>(true);
  @Input() actionTemplate: any;

  getRowId(row: Record<string, any>): any {
    return row['id'] || JSON.stringify(row);
  }

  formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return '-';
    if (type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    if (type === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'link';
  linkFn?: (row: Record<string, any>) => string | any[];
}
