import { Component, input } from '@angular/core';
@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()] || paths['home']" /></svg>`,
  styles: [`:host { display:inline-flex; width:18px; height:18px; flex-shrink:0; } svg { width:100%; height:100%; }`]
})
export class Icon {
  name = input('home');
  paths: Record<string, string> = {
    'chevron-down': 'M6 9l6 6 6-6',
    list: 'M4 5h16M4 12h8M4 19h8m5-10v10m-5-5h10',
    pencil: 'M15 4l5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z',
    fridge: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM5 9h14M8 5v2m0 5v4',
    wheat: 'M4 21 20 5M10 15c-5 1-7-2-6-5 4-1 7 1 6 5Zm4-4c-5 1-7-2-6-5 4-1 7 1 6 5Zm0 0c-1 5 2 7 5 6 1-4-1-7-5-6Zm4-4c-1-4 1-6 4-6 0 3-2 5-4 6Z',
    search: 'M21 21l-5-5M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0',
    warning: 'M12 3 2 21h20L12 3Zm0 6v5m0 3h.01',
    box: 'M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5v4',
    cart: 'M2 3h3l3 12h11l3-9H6M8 15l-1 3h13M10 21a1 1 0 1 0-2 0 1 1 0 0 0 2 0M20 21a1 1 0 1 0-2 0 1 1 0 0 0 2 0',
    home: 'M3 10 12 3l9 7v11H3V10Zm6 11V11h6v10',
    mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
    key: 'M15 3a6 6 0 0 0-5 9L3 19v3h4v-3h3v-3l2-2a6 6 0 1 0 3-11Zm2 4h.01',
    eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
    user: 'M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM5 21v-3a7 7 0 0 1 14 0v3',
    users: 'M14 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 21v-3a7 7 0 0 1 14 0v3M18 3a4 4 0 0 1 0 8m2 4a5 5 0 0 1 2 4v2',
    ticket: 'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm9 0v3m0 3v1m0 3v2',
    arrow: 'M4 12h16m-6-6 6 6-6 6'
  };
}
