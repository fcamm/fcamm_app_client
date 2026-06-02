import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'donator/:id', renderMode: RenderMode.Client },
  { path: 'admin/user/:id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
