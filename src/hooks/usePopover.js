import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const GAP = 6;

/**
 * Floating menu anchored to a trigger. The menu is `position: fixed`, so a scrolling table or a
 * card with hidden overflow never clips it; it opens upward when there is no room below.
 */
export function usePopover({ align = 'start', matchWidth = false } = {}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({ visibility: 'hidden' });
  const anchorRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !menuRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const width = matchWidth ? Math.max(anchor.width, menu.width) : menu.width;
    const fitsBelow = anchor.bottom + GAP + menu.height <= window.innerHeight;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(anchor.top - GAP - menu.height, GAP);
    const preferred = align === 'end' ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(preferred, GAP), window.innerWidth - width - GAP);
    setStyle({ top, left, minWidth: matchWidth ? anchor.width : undefined, visibility: 'visible' });
  }, [open, align, matchWidth]);

  useEffect(() => {
    if (!open) return undefined;
    const isInside = (target) =>
      anchorRef.current?.contains(target) || menuRef.current?.contains(target);
    const onPointerDown = (event) => !isInside(event.target) && close();
    const onKeyDown = (event) => event.key === 'Escape' && close();
    const onScroll = (event) => !menuRef.current?.contains(event.target) && close();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);

  return {
    open,
    setOpen,
    close,
    anchorRef,
    menuRef,
    style: open ? style : { visibility: 'hidden' },
  };
}
