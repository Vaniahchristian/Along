'use client';

import { useEffect, useRef } from 'react';
import { mountPrototype } from '../lib/prototype';

export default function HomePage() {
  const root = useRef(null);

  useEffect(() => {
    if (!root.current) return;
    return mountPrototype(root.current);
  }, []);

  return <div id="app" ref={root} />;
}
