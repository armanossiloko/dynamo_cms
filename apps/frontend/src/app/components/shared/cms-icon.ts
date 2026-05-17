import { Component, Input } from '@angular/core';

export type CmsIconName =
  | 'menu' | 'chevronDown' | 'chevronUp' | 'chevronLeft' | 'chevronRight' | 'caretDown'
  | 'table' | 'document' | 'photo' | 'bell' | 'clock'
  | 'puzzle' | 'users' | 'userPlus' | 'key' | 'book' | 'terminal' | 'schema' | 'plus' | 'close'
  | 'check' | 'search' | 'edit' | 'trash' | 'sun' | 'moon' | 'logout' | 'alert' | 'mail' | 'lock'
  | 'info' | 'warning' | 'upload' | 'copy' | 'eye' | 'more' | 'moreH' | 'filter' | 'refresh' | 'external'
  | 'globe' | 'globe2' | 'layers' | 'history' | 'folder' | 'folderOpen' | 'send' | 'archive' | 'play' | 'link' | 'minus' | 'drag'
  | 'download' | 'film' | 'list' | 'listNum' | 'paperclip' | 'star'
  | 'quote' | 'code' | 'user' | 'image' | 'eyeOff'
  | 'bold' | 'italic' | 'underline' | 'h1' | 'h2'
  | 'typeText' | 'typeNum' | 'typeBool' | 'typeDate' | 'typeRich' | 'typeRef' | 'typeFile' | 'typeSlug' | 'typeZone';

@Component({
  selector: 'cms-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="className"
      aria-hidden="true">
      @switch (name) {
        @case ('menu') {
          <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
        }
        @case ('chevronDown') { <polyline points="6 9 12 15 18 9" /> }
        @case ('caretDown') { <polyline points="6 9 12 15 18 9" /> }
        @case ('chevronUp') { <polyline points="6 15 12 9 18 15" /> }
        @case ('chevronLeft') { <polyline points="15 6 9 12 15 18" /> }
        @case ('chevronRight') { <polyline points="9 6 15 12 9 18" /> }
        @case ('table') {
          <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="20"/>
        }
        @case ('document') {
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
        }
        @case ('photo') {
          <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><polyline points="21 16 16 11 6 20"/>
        }
        @case ('image') {
          <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><polyline points="21 16 16 11 6 20"/>
        }
        @case ('bell') {
          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16z"/><path d="M10 21a2 2 0 0 0 4 0"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
        }
        @case ('puzzle') {
          <path d="M11 4a2 2 0 1 1 4 0v2h2.5A1.5 1.5 0 0 1 19 7.5V10h-2a2 2 0 1 0 0 4h2v2.5a1.5 1.5 0 0 1-1.5 1.5H15v2a2 2 0 1 1-4 0v-2H7.5A1.5 1.5 0 0 1 6 16.5V14h2a2 2 0 1 0 0-4H6V7.5A1.5 1.5 0 0 1 7.5 6H11z"/>
        }
        @case ('users') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        }
        @case ('userPlus') {
          <path d="M14 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        }
        @case ('key') {
          <circle cx="7.5" cy="15.5" r="3.5"/><path d="M11 13l9-9"/><line x1="17" y1="7" x2="20" y2="10"/><line x1="14" y1="10" x2="17" y2="13"/>
        }
        @case ('book') {
          <path d="M4 19V5a2 2 0 0 1 2-2h13v18H7a3 3 0 0 0-3 1z"/><path d="M19 16H7a3 3 0 0 0-3 3"/>
        }
        @case ('terminal') {
          <polyline points="5 8 9 12 5 16"/><line x1="12" y1="16" x2="19" y2="16"/>
        }
        @case ('schema') {
          <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><line x1="7.5" y1="7.5" x2="10.5" y2="16.5"/><line x1="16.5" y1="7.5" x2="13.5" y2="16.5"/>
        }
        @case ('plus') {
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        }
        @case ('close') {
          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
        }
        @case ('check') { <polyline points="5 12.5 10 17 19 7"/> }
        @case ('search') {
          <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/>
        }
        @case ('edit') {
          <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18 2l4 4-10 10H8v-4z"/>
        }
        @case ('trash') {
          <polyline points="3 6 21 6"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/>
        }
        @case ('moon') { <path d="M21 13a8.5 8.5 0 1 1-10-10 7 7 0 0 0 10 10z"/> }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.6"/>
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>
        }
        @case ('lock') {
          <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
        }
        @case ('drag') {
          <circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>
        }
        @case ('filter') {
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        }
        @case ('copy') {
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        }
        @case ('external') {
          <path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>
        }
        @case ('upload') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        }
        @case ('layers') {
          <polygon points="12 3 3 8 12 13 21 8 12 3"/><polyline points="3 12 12 17 21 12"/><polyline points="3 16 12 21 21 16"/>
        }
        @case ('folder') {
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        }
        @case ('film') {
          <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/>
        }
        @case ('list') {
          <line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="5" cy="6" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="18" r="1.2"/>
        }
        @case ('paperclip') {
          <path d="M21.4 11 12 20.4a5.6 5.6 0 0 1-8-8L13.4 3a4 4 0 0 1 5.7 5.7L9.6 18.2a2.5 2.5 0 0 1-3.5-3.5L15 6"/>
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
        }
        @case ('send') {
          <path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>
        }
        @case ('archive') {
          <rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><line x1="10" y1="12" x2="14" y2="12"/>
        }
        @case ('history') {
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 16 14"/>
        }
        @case ('play') {
          <polygon points="6 4 20 12 6 20 6 4"/>
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.1"/>
        }
        @case ('warning') {
          <path d="M10.3 3.7l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.3l-8-14a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.6"/>
        }
        @case ('eye') {
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        }
        @case ('eyeOff') {
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 4.06-4.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.7 18.7 0 0 1-2.16 3.19"/><line x1="14.12" y1="14.12" x2="9.88" y2="9.88"/><line x1="1" y1="1" x2="23" y2="23"/>
        }
        @case ('refresh') {
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15"/>
        }
        @case ('more') {
          <circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
        }
        @case ('moreH') {
          <circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>
        }
        @case ('quote') {
          <path d="M7 8h3v6a3 3 0 0 1-3 3"/><path d="M14 8h3v6a3 3 0 0 1-3 3"/>
        }
        @case ('code') {
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
        }
        @case ('minus') { <line x1="5" y1="12" x2="19" y2="12"/> }
        @case ('link') {
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11 5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L13 19"/>
        }
        @case ('folderOpen') {
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M21 10H5a1 1 0 0 0-1 .8L2.5 19A1 1 0 0 0 3.5 20H17.7a1 1 0 0 0 1-.8L21 11z"/>
        }
        @case ('listNum') {
          <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h2"/><path d="M4 4v4"/><path d="M4 18h2"/><path d="M6 16H4l2-2-2-2h2"/>
        }
        @case ('star') {
          <polygon points="12 3 14.6 9 21 9.7 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.7 9.4 9"/>
        }
        @case ('globe2') {
          <circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18"/><path d="M12 3c-3 3-3 15 0 18"/>
        }
        @case ('bold') {
          <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z"/>
        }
        @case ('italic') {
          <line x1="14" y1="5" x2="9" y2="19"/><line x1="11" y1="5" x2="17" y2="5"/><line x1="7" y1="19" x2="13" y2="19"/>
        }
        @case ('underline') {
          <path d="M6 4v8a6 6 0 0 0 12 0V4"/><line x1="5" y1="21" x2="19" y2="21"/>
        }
        @case ('h1') {
          <path d="M5 5v14"/><path d="M14 5v14"/><line x1="5" y1="12" x2="14" y2="12"/><path d="M17 9l2-1v11"/>
        }
        @case ('h2') {
          <path d="M5 5v14"/><path d="M14 5v14"/><line x1="5" y1="12" x2="14" y2="12"/><path d="M17 9a2 2 0 0 1 4 0c0 2-4 4-4 6h4"/>
        }
        @case ('typeText') {
          <polyline points="4 7 4 5 20 5 20 7"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="9" y1="19" x2="15" y2="19"/>
        }
        @case ('typeNum') {
          <line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="9" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="15" y2="20"/>
        }
        @case ('typeBool') {
          <rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3.5"/>
        }
        @case ('typeDate') {
          <rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>
        }
        @case ('typeRich') {
          <path d="M5 6h14"/><path d="M5 12h14"/><path d="M5 18h9"/><path d="M19 16l2 2-2 2"/>
        }
        @case ('typeRef') {
          <circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><line x1="9" y1="12" x2="15" y2="12"/>
        }
        @case ('typeFile') {
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><polyline points="14 3 14 9 20 9"/>
        }
        @case ('typeSlug') {
          <path d="M9 6l-6 6 6 6"/><line x1="11" y1="20" x2="17" y2="4"/><path d="M15 18l6-6-6-6"/>
        }
        @case ('typeZone') {
          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
        }
        @default { <circle cx="12" cy="12" r="6" /> }
      }
    </svg>
  `
})
export class CmsIcon {
  @Input({ required: true }) name!: CmsIconName;
  @Input() size = 18;
  @Input() strokeWidth = 1.6;
  @Input() className = 'ic';
}
