import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { ImageFit, ItemAppearance } from '../../domain/bookmark';
import { parseGradientDirection } from '../../shared/gradient-direction';
import { GradientDirectionControl } from '../../components/GradientDirectionControl';
import { ImageFitSelect } from '../../components/ImageFitSelect';

const createRandomColor = (): string =>
  `#${Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, '0')}`;

export type ContentKind = 'bookmark' | 'folder';

export interface CreateContentValue {
  cardAppearance: ItemAppearance;
  note: string;
  tags: readonly string[];
  title: string;
  url?: string;
}

interface CreateContentDialogProps {
  afterNote?: ReactNode;
  defaultAppearance?: ItemAppearance | undefined;
  initialValue?: CreateContentValue;
  isOpen: boolean;
  kind: ContentKind;
  onClose: () => void;
  onCreate: (value: CreateContentValue) => Promise<void>;
  onCaptureScreenshot?: (() => Promise<string>) | undefined;
  parentName: string;
  titleKey?: string | undefined;
}

/** Focused creation window shared by bookmark and folder commands. */
export function CreateContentDialog({
  afterNote,
  defaultAppearance,
  initialValue,
  isOpen,
  kind,
  onClose,
  onCreate,
  onCaptureScreenshot,
  parentName,
  titleKey,
}: CreateContentDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mode = initialValue ? 'edit' : 'create';
  const [appearanceKind, setAppearanceKind] = useState<
    ItemAppearance['kind'] | 'screenshot'
  >(initialValue?.cardAppearance.kind ?? defaultAppearance?.kind ?? 'color');
  const [color, setColor] = useState(
    initialValue?.cardAppearance.kind === 'color'
      ? initialValue.cardAppearance.value
      : defaultAppearance?.kind === 'color'
        ? defaultAppearance.value
        : '#2f7de1',
  );
  const [gradientColors, setGradientColors] = useState<
    [string, string, string]
  >(
    initialValue?.cardAppearance.kind === 'gradient'
      ? [...initialValue.cardAppearance.colors]
      : defaultAppearance?.kind === 'gradient'
        ? [...defaultAppearance.colors]
        : ['#2f7de1', '#9250bd', '#20a6ba'],
  );
  const [gradientDirection, setGradientDirection] = useState(
    initialValue?.cardAppearance.kind === 'gradient'
      ? String(initialValue.cardAppearance.direction)
      : defaultAppearance?.kind === 'gradient'
        ? String(defaultAppearance.direction)
        : '135',
  );
  const [image, setImage] = useState<string | undefined>(
    initialValue?.cardAppearance.kind === 'image'
      ? initialValue.cardAppearance.value
      : defaultAppearance?.kind === 'image'
        ? defaultAppearance.value
        : undefined,
  );
  const [imageFit, setImageFit] = useState<ImageFit>(
    initialValue?.cardAppearance.kind === 'image'
      ? initialValue.cardAppearance.fit
      : defaultAppearance?.kind === 'image'
        ? defaultAppearance.fit
        : 'fill',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [appearanceAnnouncement, setAppearanceAnnouncement] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  const resetAndClose = () => {
    setAppearanceKind('color');
    setColor('#2f7de1');
    setGradientColors(['#2f7de1', '#9250bd', '#20a6ba']);
    setGradientDirection('135');
    setImage(undefined);
    setImageFit('fill');
    setError('');
    setAppearanceAnnouncement('');
    onClose();
  };

  const randomizeColor = () => {
    const nextColor = createRandomColor();
    setColor(nextColor);
    setAppearanceAnnouncement(
      t('contentEditor.randomColorGenerated', { color: nextColor }),
    );
  };

  const randomizeGradient = () => {
    const nextColors: [string, string, string] = [
      createRandomColor(),
      createRandomColor(),
      createRandomColor(),
    ];
    const nextDirection = String(Math.floor(Math.random() * 360));
    setGradientColors(nextColors);
    setGradientDirection(nextDirection);
    setAppearanceAnnouncement(
      t('contentEditor.randomGradientGenerated', {
        colors: nextColors.join(', '),
        direction: nextDirection,
      }),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const url = String(form.get('url') ?? '').trim();
    if (appearanceKind === 'screenshot' && !image) {
      setError(t('contentEditor.screenshotRequired'));
      return;
    }
    let parsedDirection = 0;
    if (appearanceKind === 'gradient') {
      try {
        parsedDirection = parseGradientDirection(gradientDirection);
      } catch {
        setError(t('contentEditor.gradientDirectionError'));
        return;
      }
    }
    const cardAppearance: ItemAppearance =
      (appearanceKind === 'image' || appearanceKind === 'screenshot') && image
        ? { fit: imageFit, kind: 'image', value: image }
        : appearanceKind === 'gradient'
          ? {
              colors: gradientColors,
              direction: parsedDirection,
              kind: 'gradient',
            }
          : { kind: 'color', value: color };
    setIsSaving(true);
    setError('');
    try {
      await onCreate({
        cardAppearance,
        note: String(form.get('note') ?? ''),
        tags: String(form.get('tags') ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        title,
        ...(kind === 'bookmark' ? { url } : {}),
      });
      resetAndClose();
    } catch (error) {
      setError(
        error instanceof Error &&
          (error.message === 'duplicate-bookmark-cancelled' ||
            error.message === 'ftp-bookmark-cancelled')
          ? ''
          : error instanceof Error &&
              error.message === 'duplicate-bookmark-prevented'
            ? t('contentEditor.duplicatePrevented')
            : error instanceof Error && error.message === 'content-changed'
              ? t('contentEditor.concurrentChangeError')
              : error instanceof Error &&
                  error.message === 'parent-folder-not-found'
                ? t('contentEditor.destinationUnavailableError')
                : t('contentEditor.saveError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      aria-labelledby="content-editor-title"
      className="content-editor"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) resetAndClose();
      }}
      ref={dialogRef}
    >
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <div>
            <h1 id="content-editor-title">
              {t(titleKey ?? `contentEditor.${kind}.${mode}Title`)}
            </h1>
            <p>
              {t(
                mode === 'edit'
                  ? 'contentEditor.parentEdit'
                  : 'contentEditor.parent',
                { name: parentName },
              )}
            </p>
          </div>
          <button
            aria-label={t('contentEditor.close')}
            onClick={resetAndClose}
            type="button"
          >
            ×
          </button>
        </header>

        <label>
          <span>{t('contentEditor.name')}</span>
          <input
            autoFocus
            defaultValue={initialValue?.title}
            maxLength={200}
            name="title"
            required
          />
        </label>
        {kind === 'bookmark' ? (
          <label>
            <span>{t('contentEditor.url')}</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="url"
              name="url"
              defaultValue={initialValue?.url}
              placeholder="https://example.com/"
              required
              spellCheck={false}
              type="text"
            />
          </label>
        ) : null}
        <label>
          <span>{t('contentEditor.tags')}</span>
          <input
            maxLength={1000}
            name="tags"
            defaultValue={initialValue?.tags.join(', ')}
            placeholder={t('contentEditor.tagsPlaceholder')}
          />
        </label>
        <label>
          <span>{t('contentEditor.note')}</span>
          <textarea
            defaultValue={initialValue?.note}
            maxLength={10_000}
            name="note"
            rows={4}
          />
        </label>

        {afterNote}

        <fieldset>
          <legend>{t('contentEditor.appearance')}</legend>
          <div className="content-editor__appearance-options">
            {(
              [
                'color',
                'gradient',
                'image',
                ...(onCaptureScreenshot ? (['screenshot'] as const) : []),
              ] as const
            ).map((option) => (
              <label key={option}>
                <input
                  checked={appearanceKind === option}
                  name="appearance"
                  onChange={() => {
                    setAppearanceKind(option);
                    setAppearanceAnnouncement('');
                  }}
                  type="radio"
                />
                {t(`contentEditor.appearanceKinds.${option}`)}
              </label>
            ))}
          </div>
          {appearanceKind === 'color' ? (
            <div className="content-editor__color-controls">
              <input
                aria-label={t('contentEditor.color')}
                onChange={(event) => setColor(event.target.value)}
                type="color"
                value={color}
              />
              <button
                className="content-editor__randomize-button"
                onClick={randomizeColor}
                type="button"
              >
                {t('contentEditor.randomColor')}
              </button>
            </div>
          ) : null}
          {appearanceKind === 'gradient' ? (
            <div className="content-editor__gradient-controls">
              <div className="content-editor__gradient-colors">
                {gradientColors.map((gradientColor, index) => (
                  <label key={index}>
                    <span>
                      {t('contentEditor.gradientColor', {
                        number: index + 1,
                      })}
                    </span>
                    <input
                      aria-label={t('contentEditor.gradientColor', {
                        number: index + 1,
                      })}
                      onChange={(event) => {
                        const nextColors = [...gradientColors] as [
                          string,
                          string,
                          string,
                        ];
                        nextColors[index] = event.target.value;
                        setGradientColors(nextColors);
                      }}
                      type="color"
                      value={gradientColor}
                    />
                  </label>
                ))}
              </div>
              <GradientDirectionControl
                onChange={setGradientDirection}
                value={gradientDirection}
              />
              <div
                aria-label={t('contentEditor.gradientPreview')}
                className="content-editor__gradient-preview"
                role="img"
                style={{
                  background: `linear-gradient(${gradientDirection}deg, ${gradientColors.join(', ')})`,
                }}
              />
              <button
                className="content-editor__randomize-button"
                onClick={randomizeGradient}
                type="button"
              >
                {t('contentEditor.randomGradient')}
              </button>
            </div>
          ) : null}
          {appearanceKind === 'image' ? (
            <div className="content-editor__image-input">
              <ImageFitSelect onChange={setImageFit} value={imageFit} />
              <input
                accept="image/png,image/jpeg,image/bmp"
                aria-label={t('contentEditor.image')}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || file.size > 1_000_000) {
                    setImage(undefined);
                    setError(t('contentEditor.imageError'));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () =>
                    setImage(
                      typeof reader.result === 'string'
                        ? reader.result
                        : undefined,
                    );
                  reader.onerror = () =>
                    setError(t('contentEditor.imageError'));
                  reader.readAsDataURL(file);
                }}
                required={!image}
                type="file"
              />
              {image ? (
                <img alt={t('contentEditor.imagePreview')} src={image} />
              ) : null}
            </div>
          ) : null}
          {appearanceKind === 'screenshot' && onCaptureScreenshot ? (
            <div className="content-editor__image-input">
              <ImageFitSelect onChange={setImageFit} value={imageFit} />
              <button
                className="content-editor__capture-button"
                onClick={() => {
                  setError('');
                  void onCaptureScreenshot()
                    .then(setImage)
                    .catch(() => setError(t('contentEditor.screenshotError')));
                }}
                type="button"
              >
                {t(
                  image
                    ? 'contentEditor.replaceScreenshot'
                    : 'contentEditor.captureScreenshot',
                )}
              </button>
              {image ? (
                <img alt={t('contentEditor.screenshotPreview')} src={image} />
              ) : null}
            </div>
          ) : null}
          <span aria-live="polite" className="visually-hidden">
            {appearanceAnnouncement}
          </span>
        </fieldset>

        {error ? (
          <p className="content-editor__error" role="alert">
            {error}
          </p>
        ) : null}
        <footer>
          <button disabled={isSaving} onClick={resetAndClose} type="button">
            {t('contentEditor.cancel')}
          </button>
          <button disabled={isSaving} type="submit">
            {isSaving
              ? t(`contentEditor.${mode === 'edit' ? 'updating' : 'creating'}`)
              : t(
                  `contentEditor.${kind}.${mode === 'edit' ? 'save' : 'create'}`,
                )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
