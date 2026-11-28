// Line icons in one style (24 px grid, round caps), so every screen matches the design.
const PATHS = {
  back: "M19 12H5M11 6l-6 6 6 6",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  work: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  pin: "M12 21s6-5.4 6-10.5a6 6 0 0 0-12 0C6 15.6 12 21 12 21zM12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  coin: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4",
  addPlace: "M12 21s6-5.4 6-10.5a6 6 0 0 0-12 0C6 15.6 12 21 12 21zM12 7.5v6M9 10.5h6",
  fix: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  post: "M5 4h14v12H9l-4 4zM9 9h6M9 12h4",
  events: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3",
  getPin: "M12 3a4 4 0 0 1 1 7.9V21h-2V10.9A4 4 0 0 1 12 3z",
  digipin: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a3 3 0 0 1 3-3h1M18 9v6a3 3 0 0 1-3 3h-1",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  news: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  hazard: "M12 4l9 16H3zM12 10v4M12 17v.5",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  weather: "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9zM9 21l1-2M13 21l1-2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.3-1.3L17 5l-3-1-1 2h-2L10 4 7 5l.3 2L6 8.3 4 8l-1 3 2 1v0l-2 1 1 3 2-.3L7.3 17 7 19l3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3z",
  language: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17v.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  chat: "M4 5h16v11H9l-5 4z",
  phone: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 20h7",
  gift: "M4 10h16v4H4zM6 14h12v7H6zM12 10v11M12 10S10 5 8 6s0 4 4 4zM12 10s2-5 4-4 0 4-4 4z",
  chart: "M5 20V11M12 20V5M19 20v-7",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 14a6 6 0 0 1 4 6",
  bed: "M3 18V7M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v3M7 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  plus: "M12 5v14M5 12h14",
  locate: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  swap: "M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3",
  car: "M5 16h14v-4l-2-5H7l-2 5zM5 16v3M19 16v3M7.5 13.5h.5M16 13.5h.5",
  bike: "M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15l4-6h5l3 6M10 9l2 6",
  bus: "M6 4h12a1 1 0 0 1 1 1v12H5V5a1 1 0 0 1 1-1zM5 11h14M8 17v3M16 17v3M8 14h.5M15.5 14h.5",
  walk: "M13 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 21l2-6 3 2v4M8 12l2-4h4l2 4M12 8l-1 7",
  fuel: "M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-2-2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  mountain: "M3 20l6-10 4 6 3-4 5 8z",
  check: "M5 12l5 5L20 7",
  wifiOff: "M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
