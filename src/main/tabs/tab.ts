import type { WebContentsView } from "electron";

export interface Tab {
  tab_id: string;
  view: WebContentsView;
  url: string;
  title: string;
  favicon_url?: string;
  is_loading: boolean;
  created_at: number;
}
