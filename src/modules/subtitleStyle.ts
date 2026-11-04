import Store from 'electron-store';

const STORE = new Store();

const SIZE_MAP: { [key: string]: string } = {
  small: '16px',
  medium: '21px',
  large: '27px',
  xlarge: '34px',
};

/**
 * Injects (or refreshes) a stylesheet that controls how subtitles are
 * rendered (`video::cue`). Called on player mount and whenever the
 * user changes the style settings.
 */
export const applySubtitleStyle = () => {
  if (typeof document === 'undefined') return;

  const size =
    (STORE.get('subtitle_size') as string) || 'medium';
  const color =
    (STORE.get('subtitle_color') as string) || '#ffffff';

  let el = document.getElementById('nagare-subtitle-style') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'nagare-subtitle-style';
    document.head.appendChild(el);
  }

  el.textContent = `
    video::cue {
      font-size: ${SIZE_MAP[size] ?? SIZE_MAP.medium};
      color: ${color};
      background-color: rgba(0, 0, 0, 0.65);
      font-weight: 600;
      line-height: 1.35;
    }
  `;
};

export const SUBTITLE_SIZE_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Extra Large', value: 'xlarge' },
];

export const SUBTITLE_COLOR_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#ffe14d' },
  { label: 'Cyan', value: '#6ee7ff' },
  { label: 'Green', value: '#80ff9e' },
  { label: 'Pink', value: '#ff9ed8' },
];
