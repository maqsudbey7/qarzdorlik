import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { blobUrl } from '../api/client';
import { useT } from '../i18n';
import type { Photo } from '../types/api';

/** Rasm manzili: ichki (token bilan) yoki ochiq varaq orqali. */
export type PhotoSource = { kind: 'private' } | { kind: 'public'; token: string };

const path = (src: PhotoSource, id: number) =>
  src.kind === 'public' ? `/api/public/${src.token}/photos/${id}` : `/photos/${id}`;

function useImageUrl(src: PhotoSource, id: number) {
  const key = path(src, id);
  const isPublic = src.kind === 'public';
  const [url, setUrl] = useState<string | null>(isPublic ? key : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (isPublic) return;
    let alive = true;
    blobUrl(key).then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [key, isPublic]);
  return { url, failed };
}

export function AuthImage({ src, photo, className = '' }: { src: PhotoSource; photo: Photo; className?: string }) {
  const { url, failed } = useImageUrl(src, photo.id);
  if (failed) return <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className}`}><ImageOff size={18} /></div>;
  if (!url) return <div className={`animate-pulse bg-slate-200 ${className}`} />;
  return <img src={url} alt="" loading="lazy" draggable={false} className={`object-cover ${className}`} />;
}

/** Yozuvdagi rasmlar — bosilganda to'liq ekranda ochiladi. */
export function PhotoStrip({ src, photos, size = 'h-16 w-16' }: { src: PhotoSource; photos: Photo[]; size?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); setOpen(i); }}
            className={`overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:scale-[1.03] hover:ring-brand-300 ${size}`}>
            <AuthImage src={src} photo={p} className="h-full w-full" />
          </button>
        ))}
      </div>
      <Lightbox src={src} photos={photos} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}

export function Lightbox({ src, photos, index, onClose, onIndex }: { src: PhotoSource; photos: Photo[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const t = useT();
  const go = (d: number) => index !== null && onIndex((index + d + photos.length) % photos.length);
  useEffect(() => {
    if (index === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  });
  return createPortal(
    <AnimatePresence>
      {index !== null && photos[index] && (
        <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <button className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={t('c.close')} onClick={onClose}><X /></button>
          {photos.length > 1 && <div className="absolute top-5 text-sm font-semibold text-white/70">{index + 1} / {photos.length}</div>}
          <motion.div key={photos[index].id} className="max-h-[85dvh] max-w-[94vw]" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            drag={photos.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
            onDragEnd={(_, info) => { if (info.offset.x < -80) go(1); if (info.offset.x > 80) go(-1); }}
            onClick={(e) => e.stopPropagation()}>
            <AuthImage src={src} photo={photos[index]} className="max-h-[85dvh] max-w-[94vw] rounded-xl !object-contain" />
          </motion.div>
          {photos.length > 1 && (
            <>
              <button className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="←"><ChevronLeft /></button>
              <button className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="→"><ChevronRight /></button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
