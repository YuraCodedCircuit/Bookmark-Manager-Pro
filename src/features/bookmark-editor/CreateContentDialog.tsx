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
import { appearanceStyle } from '../../shared/appearance-style';
import {
  ImageCropDialog,
  type ImageCropSession,
} from '../image-crop/ImageCropDialog';
import { centeredCrop, roundedCrop } from '../image-crop/crop-geometry';
import {
  inspectCropSource,
  processCroppedImage,
} from '../image-crop/process-cropped-image';

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

interface TransientImage {
  applied: string;
  session?: ImageCropSession | undefined;
  source: string;
}

interface CreateContentDialogProps {
  afterNote?: ReactNode;
  autoCropScreenshot?: boolean | undefined;
  defaultAppearance?: ItemAppearance | undefined;
  initialValue?: CreateContentValue;
  isOpen: boolean;
  kind: ContentKind;
  onClose: () => void;
  /** Returns false when a caller defers completion to another UI decision. */
  onCreate: (value: CreateContentValue) => Promise<boolean | void>;
  onCaptureScreenshot?: (() => Promise<string>) | undefined;
  onCropFailure?: (() => Promise<void> | void) | undefined;
  onAutoCropResult?:
    ((outcome: 'fallback' | 'succeeded') => Promise<void> | void) | undefined;
  parentName: string;
  titleKey?: string | undefined;
}

/** Focused creation window shared by bookmark and folder commands. */
export function CreateContentDialog({
  afterNote,
  autoCropScreenshot = false,
  defaultAppearance,
  initialValue,
  isOpen,
  kind,
  onClose,
  onCreate,
  onCaptureScreenshot,
  onCropFailure,
  onAutoCropResult,
  parentName,
  titleKey,
}: CreateContentDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cropButtonRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
  const initialImage =
    initialValue?.cardAppearance.kind === 'image'
      ? initialValue.cardAppearance.value
      : defaultAppearance?.kind === 'image'
        ? defaultAppearance.value
        : undefined;
  const [images, setImages] = useState<{
    image?: TransientImage | undefined;
    screenshot?: TransientImage | undefined;
  }>(() => ({
    ...(initialImage
      ? { image: { applied: initialImage, source: initialImage } }
      : {}),
  }));
  const [imageFit, setImageFit] = useState<ImageFit>(
    initialValue?.cardAppearance.kind === 'image'
      ? initialValue.cardAppearance.fit
      : defaultAppearance?.kind === 'image'
        ? defaultAppearance.fit
        : 'fill',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const [appearanceAnnouncement, setAppearanceAnnouncement] = useState('');
  const [cropKind, setCropKind] = useState<'image' | 'screenshot'>();
  const activeImageKind =
    appearanceKind === 'image' || appearanceKind === 'screenshot'
      ? appearanceKind
      : undefined;
  const activeImage = activeImageKind ? images[activeImageKind] : undefined;

  const reportAutoCropResult = (outcome: 'fallback' | 'succeeded') => {
    if (!onAutoCropResult) return;
    try {
      void Promise.resolve(onAutoCropResult(outcome)).catch(() => {
        console.error('image-auto-crop-activity-log-write-failed');
      });
    } catch {
      console.error('image-auto-crop-activity-log-write-failed');
    }
  };

  const captureScreenshot = async () => {
    if (!onCaptureScreenshot || isCapturing) return;
    setIsCapturing(true);
    setError('');
    try {
      const source = await onCaptureScreenshot();
      setImageFit('fit');
      let screenshot: TransientImage = { applied: source, source };
      if (autoCropScreenshot) {
        try {
          const dimensions = await inspectCropSource(source);
          const crop = roundedCrop({
            ...centeredCrop(dimensions, 'card'),
            x: 0,
            y: 0,
          });
          screenshot = {
            applied: await processCroppedImage(source, crop),
            session: { crop, shape: 'card', zoom: 1 },
            source,
          };
          setAppearanceAnnouncement(t('contentEditor.autoCropApplied'));
          reportAutoCropResult('succeeded');
        } catch {
          setError(t('contentEditor.autoCropError'));
          reportAutoCropResult('fallback');
        }
      }
      setImages((current) => ({ ...current, screenshot }));
    } catch {
      setError(t('contentEditor.screenshotError'));
    } finally {
      setIsCapturing(false);
    }
  };

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
    setImages({});
    setImageFit('fill');
    setError('');
    setAppearanceAnnouncement('');
    setCropKind(undefined);
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
    if (appearanceKind === 'screenshot' && !activeImage) {
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
      (appearanceKind === 'image' || appearanceKind === 'screenshot') &&
      activeImage
        ? { fit: imageFit, kind: 'image', value: activeImage.applied }
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
      const shouldClose = await onCreate({
        cardAppearance,
        note: String(form.get('note') ?? ''),
        tags: String(form.get('tags') ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        title,
        ...(kind === 'bookmark' ? { url } : {}),
      });
      if (shouldClose !== false) resetAndClose();
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
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || file.size > 1_000_000) {
                    setError(t('contentEditor.imageError'));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result !== 'string') return;
                    const source = reader.result;
                    setImages((current) => ({
                      ...current,
                      image: { applied: source, source },
                    }));
                    setImageFit('fit');
                    setError('');
                  };
                  reader.onerror = () =>
                    setError(t('contentEditor.imageError'));
                  reader.readAsDataURL(file);
                }}
                ref={imageInputRef}
                type="file"
              />
              {activeImage ? (
                <>
                  <div
                    aria-label={t('contentEditor.imagePreview')}
                    className="content-editor__image-preview"
                    role="img"
                  >
                    <span
                      aria-hidden="true"
                      className="content-editor__image-preview-art"
                      style={appearanceStyle({
                        fit: imageFit,
                        kind: 'image',
                        value: activeImage.applied,
                      })}
                    />
                  </div>
                  <div className="content-editor__image-actions">
                    <button
                      className="content-editor__image-button"
                      onClick={() => imageInputRef.current?.click()}
                      type="button"
                    >
                      {t('contentEditor.chooseAnotherImage')}
                    </button>
                    <button
                      className="content-editor__image-button"
                      onClick={() => setCropKind('image')}
                      ref={cropButtonRef}
                      type="button"
                    >
                      {t('contentEditor.crop.title')}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="content-editor__image-button"
                  onClick={() => imageInputRef.current?.click()}
                  type="button"
                >
                  {t('contentEditor.image')}
                </button>
              )}
            </div>
          ) : null}
          {appearanceKind === 'screenshot' && onCaptureScreenshot ? (
            <div className="content-editor__image-input">
              <ImageFitSelect onChange={setImageFit} value={imageFit} />
              <button
                className="content-editor__capture-button"
                disabled={isCapturing}
                onClick={() => void captureScreenshot()}
                type="button"
              >
                {t(
                  isCapturing
                    ? 'contentEditor.capturingScreenshot'
                    : activeImage
                      ? 'contentEditor.replaceScreenshot'
                      : 'contentEditor.captureScreenshot',
                )}
              </button>
              {activeImage ? (
                <>
                  <div
                    aria-label={t('contentEditor.screenshotPreview')}
                    className="content-editor__image-preview"
                    role="img"
                  >
                    <span
                      aria-hidden="true"
                      className="content-editor__image-preview-art"
                      style={appearanceStyle({
                        fit: imageFit,
                        kind: 'image',
                        value: activeImage.applied,
                      })}
                    />
                  </div>
                  <button
                    className="content-editor__image-button"
                    onClick={() => setCropKind('screenshot')}
                    ref={cropButtonRef}
                    type="button"
                  >
                    {t('contentEditor.crop.title')}
                  </button>
                </>
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
          <button
            disabled={isSaving || cropKind !== undefined}
            onClick={resetAndClose}
            type="button"
          >
            {t('contentEditor.cancel')}
          </button>
          <button
            disabled={isSaving || isCapturing || cropKind !== undefined}
            type="submit"
          >
            {isSaving
              ? t(`contentEditor.${mode === 'edit' ? 'updating' : 'creating'}`)
              : t(
                  `contentEditor.${kind}.${mode === 'edit' ? 'save' : 'create'}`,
                )}
          </button>
        </footer>
      </form>
      {cropKind && images[cropKind] ? (
        <ImageCropDialog
          initialSession={images[cropKind]?.session}
          onApply={(result, session) => {
            setImages((current) => {
              const existing = current[cropKind];
              if (!existing) return current;
              return {
                ...current,
                [cropKind]: { ...existing, applied: result, session },
              };
            });
            setImageFit('fit');
            setCropKind(undefined);
            setAppearanceAnnouncement(t('contentEditor.cropApplied'));
            requestAnimationFrame(() => cropButtonRef.current?.focus());
          }}
          onCancel={() => {
            setCropKind(undefined);
            requestAnimationFrame(() => cropButtonRef.current?.focus());
          }}
          {...(onCropFailure ? { onFailure: onCropFailure } : {})}
          source={images[cropKind]?.source ?? ''}
        />
      ) : null}
    </dialog>
  );
}
