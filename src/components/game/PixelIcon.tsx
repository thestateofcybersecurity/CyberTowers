'use client';

import { useSyncExternalStore } from 'react';
import { getThreatSprite, getTowerSprite } from '@/game/art/bake';
import type { ThreatId, TowerId } from '@/game/core/types';

/**
 * Renders a baked pixel sprite as an <img>.
 *
 * Baking needs `document`, so the sprite cannot exist during server rendering.
 * `useSyncExternalStore` models that honestly: the server snapshot is null, the
 * client snapshot is the data URL. Results are cached module-wide and keyed by
 * sprite, so the snapshot is referentially stable and every instance of the
 * same icon shares one bake.
 */
const urlCache = new Map<string, string>();

/** The cache is write-once per key, so there is nothing to subscribe to. */
const subscribe = () => () => {};

type Props =
  | { kind: 'tower'; id: TowerId; tier?: number; size?: number; className?: string }
  | { kind: 'threat'; id: ThreatId; tier?: never; size?: number; className?: string };

export default function PixelIcon(props: Props) {
  const size = props.size ?? 32;
  const tier = props.kind === 'tower' ? (props.tier ?? 0) : 0;
  const key = `${props.kind}:${props.id}:${tier}:${size}`;

  const url = useSyncExternalStore(
    subscribe,
    () => {
      const cached = urlCache.get(key);
      if (cached) return cached;
      const canvas =
        props.kind === 'tower'
          ? getTowerSprite(props.id, tier, size)
          : getThreatSprite(props.id, size);
      const dataUrl = canvas.toDataURL();
      urlCache.set(key, dataUrl);
      return dataUrl;
    },
    () => null,
  );

  if (!url) {
    return <span style={{ width: size, height: size }} className={props.className} aria-hidden />;
  }

  return (
    // A runtime-generated data URL cannot go through next/image, which needs a
    // statically known source to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={`[image-rendering:pixelated] ${props.className ?? ''}`}
    />
  );
}
