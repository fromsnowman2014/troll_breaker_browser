// Minimal ko + en map for Phase 0. UI mostly in Korean per UI_UX_SPEC §1.

export const STRINGS = {
  ko: {
    app_name: "Truth & Strike",
    url_bar_placeholder: "주소를 입력하거나 검색어를 입력하세요",
    drawer_title: "Settings",
    drawer_placeholder:
      "API 키, 모델, 검색 설정 등은 Phase 1에서 구현됩니다. 지금은 브라우저 셸만 사용할 수 있습니다.",
    drawer_close: "닫기",
    find_placeholder: "페이지에서 찾기",
    new_tab: "새 탭",
    close_tab: "탭 닫기",
    new_tab_title: "새 탭",
  },
  en: {
    app_name: "Truth & Strike",
    url_bar_placeholder: "Type a URL or a search query",
    drawer_title: "Settings",
    drawer_placeholder:
      "API key, model picker, search settings land in Phase 1. The browser shell is all you get for now.",
    drawer_close: "Close",
    find_placeholder: "Find in page",
    new_tab: "New Tab",
    close_tab: "Close Tab",
    new_tab_title: "New Tab",
  },
} as const;

export type Locale = keyof typeof STRINGS;
export const DEFAULT_LOCALE: Locale = "ko";

export function t(key: keyof (typeof STRINGS)["ko"], locale: Locale = DEFAULT_LOCALE): string {
  return STRINGS[locale][key];
}
