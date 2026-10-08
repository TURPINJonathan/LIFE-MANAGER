import { useEffect, useRef, useState } from 'react';

import { Button, Dialog, Icon, Spinner, Typography } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, SPINNER_VARIANT } from '@constants';
import { fetchTimesheetPdf, type TimesheetPdfKind } from '@services';
import { cn, toastFromError } from '@utils';

type TimesheetPdfDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  jobId: string;
  yearMonth: string;
  monthLabel: string;
};

const KINDS: { value: TimesheetPdfKind; label: string }[] = [
  { value: 'filled', label: 'Feuille d’heures' },
  { value: 'blank', label: 'Pointage vierge' },
];

export function TimesheetPdfDialog({ isOpen, onClose, token, jobId, yearMonth, monthLabel }: TimesheetPdfDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [kind, setKind] = useState<TimesheetPdfKind>('filled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState(`feuille-heures-${yearMonth}.pdf`);

  useEffect(() => {
    if (!isOpen) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      setError(null);
      setLoading(false);
      setKind('filled');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);

      try {
        const result = await fetchTimesheetPdf(token, jobId, yearMonth, kind);
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setFilename(result.filename);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : kind === 'blank'
              ? 'Impossible de générer le pointage vierge.'
              : 'Impossible de générer la feuille d’heures.';
        setError(message);
        toastFromError(err, message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, token, jobId, yearMonth, kind]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  const download = () => {
    if (!objectUrl) return;
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  };

  const print = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };

  const title = kind === 'blank' ? `Pointage vierge · ${monthLabel}` : `Feuille d’heures · ${monthLabel}`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} icon="picture_as_pdf" size={DIALOG_SIZE.full}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-control border border-border-subtle bg-subtle p-0.5"
            role="group"
            aria-label="Type de document"
          >
            {KINDS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setKind(item.value)}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center rounded-control px-3 text-control font-medium transition-colors',
                  kind === item.value ? 'bg-elevated text-fg-primary' : 'text-fg-muted hover:text-fg-primary',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant={BUTTON_VARIANT.success}
            fullWidth={false}
            className="w-auto px-3"
            disabled={!objectUrl || loading}
            onClick={download}
          >
            <Icon name="download" className="text-icon-sm" />
            Télécharger
          </Button>
          <Button
            type="button"
            variant={BUTTON_VARIANT.neutral}
            fullWidth={false}
            className="w-auto px-3"
            disabled={!objectUrl || loading}
            onClick={print}
          >
            <Icon name="print" className="text-icon-sm" />
            Imprimer
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-control border border-border-subtle bg-subtle">
          {loading ? (
            <div className="flex h-full min-h-[50dvh] flex-col items-center justify-center gap-3">
              <Spinner variant={SPINNER_VARIANT.page} />
              <Typography variant="body" className="text-fg-secondary">
                Génération du PDF…
              </Typography>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex h-full min-h-[50dvh] items-center justify-center p-6">
              <Typography variant="body" className="text-center text-fg-secondary">
                {error}
              </Typography>
            </div>
          ) : null}

          {!loading && !error && objectUrl ? (
            <iframe
              ref={iframeRef}
              title={`Aperçu ${title}`}
              src={objectUrl}
              className="h-full min-h-[50dvh] w-full bg-white md:min-h-0"
            />
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
