# Rich Text Editor Field Type

## Overview
Add a dedicated field type for rich text content that stores structured data (JSON) and integrates with client-side WYSIWYG editors like TipTap, Quill, or Slate.

## Priority: 1 (Most Important)
This is essential for any content-heavy application. Plain text fields are insufficient for articles, blog posts, product descriptions, or marketing content.

## Implementation Plan

### Backend Changes

#### 1. Add RichText BaseType
**File: `backend/src/Dynamo.CMS.API/Models/BaseType.cs`**
- Add new enum value: `RichText = 7`
- Update validation rules to accept rich text type

#### 2. Update PostgreSQL Generator
**File: `backend/src/Dynamo.CMS.API/Services/PostgreSQLGenerator.cs`**
- Add case for `RichText` type to generate `jsonb` columns
- Ensure proper indexing for jsonb fields

```csharp
case BaseType.RichText:
    return "jsonb";
```

#### 3. Create Rich Text Validation
**File: `backend/src/Dynamo.CMS.API/Services/SqlValidator.cs`**
- Add validation for JSON structure in rich text fields
- Validate against schema (e.g., TipTap JSON format)

#### 4. Update DataController
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
- Handle rich text data serialization/deserialization
- Ensure JSON data is properly escaped in SQL queries

### Frontend Changes

#### 1. Install WYSIWYG Editor Library
```bash
cd frontend
npm install @tiptap/starter-kit @tiptap/angular
```

#### 2. Create Rich Text Editor Component
**File: `frontend/src/app/components/shared/rich-text-editor.component.ts`**
- Integrate TipTap or Quill editor
- Handle two-way data binding
- Support image uploads within editor
- Provide toolbar options

```typescript
@Component({
  selector: 'app-rich-text-editor',
  template: `<editor [editor]="editor" [content]="content" (update)="onUpdate($event)"></editor>`,
  standalone: true,
  imports: [EditorModule]
})
export class RichTextEditorComponent implements OnInit {
  editor = new Editor({
    extensions: [StarterKit, Image, Link, ...]
  });

  @Input() content: any;
  @Output() contentChange = new EventEmitter<any>();

  onUpdate({ editor }: { editor: Editor }) {
    this.contentChange.emit(editor.getJSON());
  }
}
```

#### 3. Update Data Entry Forms
**File: `frontend/src/app/components/data/data-entry.component.ts`**
- Detect rich text field types
- Render rich text editor instead of textarea
- Handle JSON data format

#### 4. Update Collection Schema Form
**File: `frontend/src/app/components/collections/collection-form.component.ts`**
- Add "Rich Text" option to field type selector
- Allow configuration of editor options (toolbar, plugins, etc.)

### Database Changes

#### Migration
Create migration to support existing collections using rich text:
```sql
-- Example migration for converting text fields to jsonb
ALTER TABLE posts ALTER COLUMN content TYPE jsonb USING content::jsonb;
```

## API Changes

### Existing Endpoints
No new endpoints required. Rich text data is handled through existing:
- `POST /api/data/{collection}` - Create entry with rich text
- `PUT /api/data/{collection}/{id}` - Update rich text
- `GET /api/data/{collection}` - Retrieve rich text as JSON

### Data Format
Rich text will be stored as JSON in the database:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "world" }
      ]
    }
  ]
}
```

## Testing

### Unit Tests
- Test PostgreSQL generation for rich text type
- Test JSON validation for rich text content
- Test data serialization/deserialization

### Integration Tests
- Test creating collection with rich text field
- Test CRUD operations on rich text content
- Test editor integration with backend

## Dependencies

### Backend
- No new dependencies required (uses built-in jsonb support)

### Frontend
- `@tiptap/starter-kit` or `@tiptap/angular`
- Alternatively: `ngx-quill` for Quill editor

## Considerations

1. **Editor Choice**: TipTap is headless and flexible, Quill is easier to set up
2. **Content Sanitization**: Implement server-side sanitization to prevent XSS
3. **Image Handling**: Rich text editor needs integration with Media Library
4. **Versioning**: Consider storing revision history for rich text content
5. **Performance**: jsonb fields may impact performance for large content
6. **Export**: Add ability to export rich text to Markdown or HTML

## Rollout Plan

1. **Phase 1**: Backend type support and PostgreSQL generator
2. **Phase 2**: Basic rich text editor component (minimal toolbar)
3. **Phase 3**: Full editor with images, links, tables
4. **Phase 4**: Advanced features (collaboration, version history)

## Success Criteria

- Users can create collections with rich text fields
- Rich text editor displays correctly in frontend
- Rich text content saves and loads correctly
- Editor supports basic formatting (bold, italic, lists, links)
- Images can be embedded in rich text
- No XSS vulnerabilities in rich text content
