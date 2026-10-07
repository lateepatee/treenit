import { useEffect, useState } from 'react';

export interface ChartColors {
  surface: string;
  grid: string;
  axis: string;
  muted: string;
  series1: string;
}

// Värit luetaan CSS-muuttujista, jotta vaalea/tumma teema määritellään vain index.css:ssä.
function read(): ChartColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    surface: v('--surface'),
    grid: v('--grid'),
    axis: v('--axis'),
    muted: v('--muted'),
    series1: v('--series-1'),
  };
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColors(read());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return colors;
}
