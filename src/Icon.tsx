const paths = {
  leaf: 'M19 4C8 3 3 8 5 15c2 7 13 5 14-11ZM5 20l9-10',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Zm9 2v15',
  chart: 'M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
  lock: 'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  spark: 'm12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3Z',
  chat: 'M4 4h16v12H9l-5 4Zm4 5h8m-8 3h5',
};

export function Icon({
  name,
  size = 20,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
