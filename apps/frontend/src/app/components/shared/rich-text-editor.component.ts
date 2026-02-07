import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rich-text-editor border border-border-primary rounded-xl overflow-hidden">
      <!-- Toolbar -->
      <div
        class="toolbar flex items-center gap-1 p-2.5 border-b border-border-primary bg-bg-tertiary/50 flex-wrap"
      >
        <!-- Text formatting -->
        <button
          type="button"
          (click)="toggleBold()"
          [class.active]="editor()?.isActive('bold')"
          class="toolbar-btn"
          title="Bold"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="toggleItalic()"
          [class.active]="editor()?.isActive('italic')"
          class="toolbar-btn"
          title="Italic"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m2 1l3 3-3 3M5 12l3-3 3 3"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="toggleStrike()"
          [class.active]="editor()?.isActive('strike')"
          class="toolbar-btn"
          title="Strikethrough"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12h18M9 5h6M9 19h6"
            ></path>
          </svg>
        </button>

        <div class="w-px h-5 bg-border-primary mx-1.5"></div>

        <!-- Headings -->
        <button
          type="button"
          (click)="toggleHeading(1)"
          [class.active]="editor()?.isActive('heading', { level: 1 })"
          class="toolbar-btn"
          title="Heading 1"
        >
          H1
        </button>

        <button
          type="button"
          (click)="toggleHeading(2)"
          [class.active]="editor()?.isActive('heading', { level: 2 })"
          class="toolbar-btn"
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          (click)="toggleHeading(3)"
          [class.active]="editor()?.isActive('heading', { level: 3 })"
          class="toolbar-btn"
          title="Heading 3"
        >
          H3
        </button>

        <div class="w-px h-5 bg-border-primary mx-1.5"></div>

        <!-- Lists -->
        <button
          type="button"
          (click)="toggleBulletList()"
          [class.active]="editor()?.isActive('bulletList')"
          class="toolbar-btn"
          title="Bullet List"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="toggleOrderedList()"
          [class.active]="editor()?.isActive('orderedList')"
          class="toolbar-btn"
          title="Ordered List"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5h12M9 12h12M9 19h12M3 5v4m0 0h2m-2 0v4m0-8h2M3 12v4m0 0h2m-2 0v4"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="toggleBlockquote()"
          [class.active]="editor()?.isActive('blockquote')"
          class="toolbar-btn"
          title="Blockquote"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            ></path>
          </svg>
        </button>

        <div class="w-px h-5 bg-border-primary mx-1.5"></div>

        <!-- Code -->
        <button
          type="button"
          (click)="toggleCode()"
          [class.active]="editor()?.isActive('code')"
          class="toolbar-btn"
          title="Inline Code"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="toggleCodeBlock()"
          [class.active]="editor()?.isActive('codeBlock')"
          class="toolbar-btn"
          title="Code Block"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
        </button>

        <div class="w-px h-5 bg-border-primary mx-1.5"></div>

        <!-- Utilities -->
        <button
          type="button"
          (click)="setLink()"
          [class.active]="editor()?.isActive('link')"
          class="toolbar-btn"
          title="Add Link"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="undo()"
          [disabled]="!canUndo()"
          class="toolbar-btn"
          title="Undo"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            ></path>
          </svg>
        </button>

        <button
          type="button"
          (click)="redo()"
          [disabled]="!canRedo()"
          class="toolbar-btn"
          title="Redo"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Editor Content -->
      <div
        #editorElement
        class="editor-content p-4 min-h-[200px] max-h-[600px] overflow-y-auto bg-bg-primary"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .toolbar-btn {
        padding: 0.375rem 0.5rem;
        border-radius: 0.5rem;
        background: transparent;
        color: rgb(var(--color-text-muted));
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        font-weight: 500;
        border: 1px solid transparent;
      }

      .toolbar-btn:hover:not(:disabled) {
        background: rgb(var(--color-interactive-hover) / var(--color-interactive-hover-opacity));
        color: rgb(var(--color-text-primary));
      }

      .toolbar-btn.active {
        background: rgb(var(--color-accent));
        color: white;
        border-color: rgb(var(--color-accent));
      }

      .toolbar-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .editor-content :deep(.ProseMirror) {
        outline: none;
        min-height: 200px;
        font-family: var(--font-body);
      }

      .editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        float: left;
        color: rgb(var(--color-text-muted));
        pointer-events: none;
        height: 0;
      }

      .editor-content :deep(.ProseMirror h1) {
        font-family: var(--font-display);
        font-size: 2em;
        font-weight: normal;
        margin: 0.5em 0;
      }

      .editor-content :deep(.ProseMirror h2) {
        font-family: var(--font-display);
        font-size: 1.5em;
        font-weight: normal;
        margin: 0.5em 0;
      }

      .editor-content :deep(.ProseMirror h3) {
        font-family: var(--font-display);
        font-size: 1.25em;
        font-weight: normal;
        margin: 0.5em 0;
      }

      .editor-content :deep(.ProseMirror ul),
      .editor-content :deep(.ProseMirror ol) {
        padding-left: 1.5em;
        margin: 0.5em 0;
      }

      .editor-content :deep(.ProseMirror blockquote) {
        border-left: 3px solid rgb(var(--color-accent) / 0.3);
        padding-left: 1em;
        margin: 1em 0;
        color: rgb(var(--color-text-muted));
      }

      .editor-content :deep(.ProseMirror code) {
        background: rgb(var(--color-bg-tertiary));
        padding: 0.2em 0.4em;
        border-radius: 0.375em;
        font-family: monospace;
        font-size: 0.9em;
      }

      .editor-content :deep(.ProseMirror pre) {
        background: rgb(var(--color-bg-tertiary));
        padding: 1em;
        border-radius: 0.75em;
        overflow-x: auto;
        margin: 1em 0;
      }

      .editor-content :deep(.ProseMirror pre code) {
        background: transparent;
        padding: 0;
      }

      .editor-content :deep(.ProseMirror a) {
        color: rgb(var(--color-accent));
        text-decoration: underline;
      }

      .editor-content :deep(.ProseMirror img) {
        max-width: 100%;
        height: auto;
        border-radius: 0.75em;
      }
    `,
  ],
})
export class RichTextEditorComponent implements OnInit, OnDestroy {
  @Input() content: any = null;
  @Input() placeholder: string = 'Start typing...';
  @Output() contentChange = new EventEmitter<any>();

  editor = signal<Editor | null>(null);

  constructor() {
    // Watch for content changes from the editor and emit them
    effect(() => {
      const editorInstance = this.editor();
      if (editorInstance) {
        editorInstance.on('update', () => {
          const json = editorInstance.getJSON();
          this.contentChange.emit(json);
        });
      }
    });
  }

  ngOnInit(): void {
    const editorInstance = new Editor({
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'editor-image',
          },
        }),
        Placeholder.configure({
          placeholder: this.placeholder,
        }),
      ],
      content: this.content || '',
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none',
        },
      },
    });

    this.editor.set(editorInstance);
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }

  // Text formatting
  toggleBold(): void {
    this.editor()?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor()?.chain().focus().toggleItalic().run();
  }

  toggleStrike(): void {
    this.editor()?.chain().focus().toggleStrike().run();
  }

  toggleCode(): void {
    this.editor()?.chain().focus().toggleCode().run();
  }

  // Headings
  toggleHeading(level: 1 | 2 | 3): void {
    this.editor()
      ?.chain()
      .focus()
      .toggleHeading({ level })
      .run();
  }

  // Lists
  toggleBulletList(): void {
    this.editor()?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor()?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(): void {
    this.editor()?.chain().focus().toggleBlockquote().run();
  }

  toggleCodeBlock(): void {
    this.editor()?.chain().focus().toggleCodeBlock().run();
  }

  // Links
  setLink(): void {
    const previousUrl = this.editor()?.getAttributes('link')['href'];
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      this.editor()?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    this.editor()?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  // History
  canUndo(): boolean {
    const editorInstance = this.editor();
    return editorInstance?.can().undo() ?? false;
  }

  canRedo(): boolean {
    const editorInstance = this.editor();
    return editorInstance?.can().redo() ?? false;
  }

  undo(): void {
    this.editor()?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor()?.chain().focus().redo().run();
  }
}
