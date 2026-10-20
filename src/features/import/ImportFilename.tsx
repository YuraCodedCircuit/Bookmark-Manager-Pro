import { useLayoutEffect, useRef, useState } from 'react';

/** Keeps both ends of an import label visible, with its full accessible and hover text. */
export function ImportFilename({ name }: { name: string }) {
  const element = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(name);
  useLayoutEffect(() => {
    const node = element.current!;
    const canvas = document.createElement('canvas');
    let active = true;
    const update = () => {
      if (!active || node.clientWidth <= 0) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.font = getComputedStyle(node).font;
      const width = node.clientWidth - 2;
      if (context.measureText(name).width <= width) {
        setDisplay(name);
        return;
      }
      const characters = Array.from(name);
      let low = 0;
      let high = characters.length - 1;
      const shorten = (count: number) => {
        const left = Math.ceil(count / 2);
        const right = Math.floor(count / 2);
        return (
          characters.slice(0, left).join('') +
          '…' +
          (right ? characters.slice(-right).join('') : '')
        );
      };
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (context.measureText(shorten(middle)).width <= width) low = middle;
        else high = middle - 1;
      }
      setDisplay(shorten(low));
    };
    update();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(update);
    observer?.observe(node);
    void document.fonts?.ready.then(update);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [name]);
  return (
    <strong
      ref={element}
      className="import-dialog__filename"
      title={name}
      aria-label={name}
    >
      {display}
    </strong>
  );
}
