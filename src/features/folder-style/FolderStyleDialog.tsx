import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageCropDialog,
  type ImageCropSession,
} from '../image-crop/ImageCropDialog';

import type { ImageFit } from '../../domain/bookmark';
import type { FolderBackgroundAppearance } from '../../domain/folder';
import { parseGradientDirection } from '../../shared/gradient-direction';
import { GradientDirectionControl } from '../../components/GradientDirectionControl';
import { ImageFitSelect } from '../../components/ImageFitSelect';
import { ClearIcon } from '../../components/icons/ClearIcon';
import type { ProfileSettings } from '../../domain/profile-settings';
import {
  optimizeFolderWallpaper,
  WallpaperOptimizationError,
} from '../../shared/optimize-folder-wallpaper';
import { useFileInputCancelRef } from '../../shared/file-input-cancel';

export interface FolderStyleValue {
  appearance: FolderBackgroundAppearance;
  bookmarkGroupBy: NonNullable<ProfileSettings['bookmarkGroupBy']>;
  bookmarkSortBy: NonNullable<ProfileSettings['bookmarkSortBy']>;
  bookmarkSortDirection: NonNullable<ProfileSettings['bookmarkSortDirection']>;
  bookmarkView: ProfileSettings['bookmarkView'];
  cardSize: ProfileSettings['cardSize'];
  cardSpacing: NonNullable<ProfileSettings['cardSpacing']>;
  detailsTableTransparency: number;
  includeNavigationBackground: boolean;
  navigationTransparency: number;
}

interface FolderStyleDialogProps {
  allowLargeWallpaperImports?: boolean;
  appearance: FolderBackgroundAppearance;
  bookmarkGroupBy: NonNullable<ProfileSettings['bookmarkGroupBy']>;
  bookmarkSortBy: NonNullable<ProfileSettings['bookmarkSortBy']>;
  bookmarkSortDirection: NonNullable<ProfileSettings['bookmarkSortDirection']>;
  bookmarkView: ProfileSettings['bookmarkView'];
  cardSize: ProfileSettings['cardSize'];
  cardSpacing: NonNullable<ProfileSettings['cardSpacing']>;
  detailsTableTransparency: number;
  folderName: string;
  isOpen: boolean;
  includeNavigationBackground: boolean;
  navigationTransparency: number;
  onClose: () => void;
  onCropFailure?: () => void | Promise<void>;
  onImageRejected?: (unexpected?: boolean) => void | Promise<void>;
  onSave: (value: FolderStyleValue) => Promise<void>;
}

const createRandomColor = (): string =>
  `#${Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, '0')}`;

/** Edits the local background appearance of the currently open folder. */
export function FolderStyleDialog({
  allowLargeWallpaperImports = false,
  appearance,
  bookmarkGroupBy,
  bookmarkSortBy,
  bookmarkSortDirection,
  bookmarkView,
  cardSize,
  cardSpacing,
  detailsTableTransparency,
  folderName,
  isOpen,
  includeNavigationBackground,
  navigationTransparency,
  onClose,
  onCropFailure,
  onImageRejected,
  onSave,
}: FolderStyleDialogProps) {
  const { t } = useTranslation();
  const imageInputCancelRef = useFileInputCancelRef<HTMLInputElement>();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cropButtonRef = useRef<HTMLButtonElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSession, setCropSession] = useState<ImageCropSession>();
  // Keep the uncropped source only in this form so another crop can restore edges.
  const [cropSource, setCropSource] = useState<string | undefined>(
    appearance.kind === 'image' ? appearance.value : undefined,
  );
  const [kind, setKind] = useState<FolderBackgroundAppearance['kind']>(
    appearance.kind,
  );
  const [color, setColor] = useState(
    appearance.kind === 'color' ? appearance.value : '#0b121a',
  );
  const [colors, setColors] = useState<[string, string, string]>(
    appearance.kind === 'gradient'
      ? [...appearance.colors]
      : ['#0b121a', '#2f7de1', '#9250bd'],
  );
  const [direction, setDirection] = useState(
    appearance.kind === 'gradient' ? String(appearance.direction) : '135',
  );
  const [image, setImage] = useState<string | undefined>(
    appearance.kind === 'image' ? appearance.value : undefined,
  );
  const [imageFit, setImageFit] = useState<ImageFit>(
    appearance.kind === 'image' ? appearance.fit : 'fill',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [view, setView] = useState(bookmarkView);
  const [size, setSize] = useState(cardSize);
  const [spacing, setSpacing] = useState(cardSpacing);
  const [sortBy, setSortBy] = useState(bookmarkSortBy);
  const [sortDirection, setSortDirection] = useState(bookmarkSortDirection);
  const [groupBy, setGroupBy] = useState(bookmarkGroupBy);
  const [tableTransparency, setTableTransparency] = useState(
    detailsTableTransparency,
  );
  const [includeNavigation, setIncludeNavigation] = useState(
    includeNavigationBackground,
  );
  const [transparency, setTransparency] = useState(navigationTransparency);
  const [openSection, setOpenSection] = useState<
    'view' | 'background' | 'navigation' | null
  >(null);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cropOpen || processingImage || saving) return;
    let parsedDirection = 0;
    if (kind === 'gradient') {
      try {
        parsedDirection = parseGradientDirection(direction);
      } catch {
        setError(t('contentEditor.gradientDirectionError'));
        return;
      }
    }
    const value: FolderBackgroundAppearance =
      kind === 'none'
        ? { kind: 'none' }
        : kind === 'image' && image
          ? { fit: imageFit, kind: 'image', value: image }
          : kind === 'gradient'
            ? { colors, direction: parsedDirection, kind: 'gradient' }
            : { kind: 'color', value: color };
    setSaving(true);
    setError('');
    try {
      await onSave({
        appearance: value,
        bookmarkGroupBy: groupBy,
        bookmarkSortBy: sortBy,
        bookmarkSortDirection: sortDirection,
        bookmarkView: view,
        cardSize: size,
        cardSpacing: spacing,
        detailsTableTransparency: tableTransparency,
        includeNavigationBackground:
          kind === 'none' ? false : includeNavigation,
        navigationTransparency: transparency,
      });
      onClose();
    } catch {
      setError(t('folderStyle.error'));
    } finally {
      setSaving(false);
    }
  };

  const reportImageRejection = (cause?: unknown) => {
    const unexpected =
      cause !== undefined &&
      !(
        cause instanceof WallpaperOptimizationError && cause.reason !== 'encode'
      );
    setImage(undefined);
    setCropSource(undefined);
    setCropSession(undefined);
    setError('');
    try {
      void Promise.resolve(onImageRejected?.(unexpected)).catch(() =>
        console.error('A privacy-safe image warning could not be displayed.'),
      );
    } catch {
      console.error('A privacy-safe image warning could not be displayed.');
    }
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
    setColors(nextColors);
    setDirection(nextDirection);
    setAppearanceAnnouncement(
      t('contentEditor.randomGradientGenerated', {
        colors: nextColors.join(', '),
        direction: nextDirection,
      }),
    );
  };

  return (
    <dialog
      aria-labelledby="folder-style-title"
      className="content-editor"
      onCancel={(event) => {
        event.preventDefault();
        if (event.target !== event.currentTarget) return;
        if (!saving) onClose();
      }}
      onClose={() => setOpenSection(null)}
      ref={dialogRef}
    >
      <form
        className="content-editor__fixed-form"
        onSubmit={(event) => void submit(event)}
      >
        <header>
          <div>
            <h1 id="folder-style-title">{t('folderStyle.title')}</h1>
            <p>{t('folderStyle.summary', { name: folderName })}</p>
          </div>
          <button
            aria-label={t('folderStyle.close')}
            onClick={onClose}
            type="button"
          >
            <ClearIcon />
          </button>
        </header>
        <div className="content-editor__body folder-style__body">
          <details
            className="folder-style__section"
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenSection((current) =>
                isOpen ? 'view' : current === 'view' ? null : current,
              );
            }}
            open={openSection === 'view'}
          >
            <summary>{t('folderStyle.view')}</summary>
            <div className="folder-style__section-content">
              <label>
                <span>{t('displaySettings.view')}</span>
                <select
                  onChange={(event) =>
                    setView(
                      event.target.value === 'list'
                        ? 'list'
                        : event.target.value === 'details'
                          ? 'details'
                          : 'card',
                    )
                  }
                  value={view}
                >
                  <option value="card">{t('displaySettings.card')}</option>
                  <option value="list">{t('displaySettings.list')}</option>
                  <option value="details">
                    {t('displaySettings.details')}
                  </option>
                </select>
              </label>
              <label>
                <span>{t('displaySettings.size')}</span>
                <select
                  disabled={view !== 'card'}
                  onChange={(event) =>
                    setSize(
                      event.target.value === 'small'
                        ? 'small'
                        : event.target.value === 'large'
                          ? 'large'
                          : 'medium',
                    )
                  }
                  value={size}
                >
                  <option value="small">{t('displaySettings.small')}</option>
                  <option value="medium">{t('displaySettings.medium')}</option>
                  <option value="large">{t('displaySettings.large')}</option>
                </select>
              </label>
              <label>
                <span>{t('displaySettings.spacing')}</span>
                <select
                  disabled={view !== 'card'}
                  onChange={(event) =>
                    setSpacing(
                      event.target.value === 'compact'
                        ? 'compact'
                        : event.target.value === 'spacious'
                          ? 'spacious'
                          : 'comfortable',
                    )
                  }
                  value={spacing}
                >
                  <option value="compact">
                    {t('displaySettings.compact')}
                  </option>
                  <option value="comfortable">
                    {t('displaySettings.comfortable')}
                  </option>
                  <option value="spacious">
                    {t('displaySettings.spacious')}
                  </option>
                </select>
              </label>
              <label>
                <span>{t('displaySettings.sortBy')}</span>
                <select
                  onChange={(event) =>
                    setSortBy(
                      event.target.value === 'title' ||
                        event.target.value === 'createdAt' ||
                        event.target.value === 'updatedAt' ||
                        event.target.value === 'domain'
                        ? event.target.value
                        : 'manual',
                    )
                  }
                  value={sortBy}
                >
                  <option value="manual">
                    {t('displaySettings.manualOrder')}
                  </option>
                  <option value="title">
                    {t('displaySettings.itemTitle')}
                  </option>
                  <option value="createdAt">
                    {t('displaySettings.dateCreated')}
                  </option>
                  <option value="updatedAt">
                    {t('displaySettings.dateModified')}
                  </option>
                  <option value="domain">{t('displaySettings.domain')}</option>
                </select>
              </label>
              <label>
                <span>{t('displaySettings.direction')}</span>
                <select
                  disabled={sortBy === 'manual'}
                  onChange={(event) =>
                    setSortDirection(
                      event.target.value === 'descending'
                        ? 'descending'
                        : 'ascending',
                    )
                  }
                  value={sortDirection}
                >
                  <option value="ascending">
                    {t('displaySettings.ascending')}
                  </option>
                  <option value="descending">
                    {t('displaySettings.descending')}
                  </option>
                </select>
              </label>
              <label>
                <span>{t('displaySettings.groupBy')}</span>
                <select
                  onChange={(event) =>
                    setGroupBy(
                      event.target.value === 'type' ||
                        event.target.value === 'domain'
                        ? event.target.value
                        : 'none',
                    )
                  }
                  value={groupBy}
                >
                  <option value="none">{t('displaySettings.none')}</option>
                  <option value="type">{t('displaySettings.type')}</option>
                  <option value="domain">{t('displaySettings.domain')}</option>
                </select>
              </label>
              {view === 'details' ? (
                <label>
                  <span>
                    {t('folderStyle.detailsTableTransparency', {
                      value: tableTransparency,
                    })}
                  </span>
                  <input
                    aria-label={t('folderStyle.detailsTableTransparency', {
                      value: tableTransparency,
                    })}
                    max={100}
                    min={0}
                    onChange={(event) =>
                      setTableTransparency(Number(event.target.value))
                    }
                    step={1}
                    type="range"
                    value={tableTransparency}
                  />
                  <span className="content-editor__help">
                    {t('folderStyle.detailsTableTransparencyHelp')}
                  </span>
                </label>
              ) : null}
            </div>
          </details>
          <details
            className="folder-style__section"
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenSection((current) =>
                isOpen
                  ? 'background'
                  : current === 'background'
                    ? null
                    : current,
              );
            }}
            open={openSection === 'background'}
          >
            <summary>{t('folderStyle.background')}</summary>
            <div className="folder-style__section-content">
              <div className="content-editor__appearance-options">
                {(['none', 'color', 'gradient', 'image'] as const).map(
                  (option) => (
                    <label key={option}>
                      <input
                        checked={kind === option}
                        name="folder-style"
                        onChange={() => {
                          setKind(option);
                          setAppearanceAnnouncement('');
                        }}
                        type="radio"
                      />
                      {option === 'none'
                        ? t('folderStyle.noBackground')
                        : t(`contentEditor.appearanceKinds.${option}`)}
                    </label>
                  ),
                )}
              </div>
              {kind === 'color' ? (
                <div className="content-editor__color-controls">
                  <input
                    aria-label={t('folderStyle.color')}
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
              {kind === 'gradient' ? (
                <div className="content-editor__gradient-controls">
                  <div className="content-editor__gradient-colors">
                    {colors.map((value, index) => (
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
                            const next = [...colors] as [
                              string,
                              string,
                              string,
                            ];
                            next[index] = event.target.value;
                            setColors(next);
                          }}
                          type="color"
                          value={value}
                        />
                      </label>
                    ))}
                  </div>
                  <GradientDirectionControl
                    onChange={setDirection}
                    value={direction}
                  />
                  <div
                    aria-label={t('contentEditor.gradientPreview')}
                    className="content-editor__gradient-preview"
                    role="img"
                    style={{
                      background: `linear-gradient(${direction}deg, ${colors.join(', ')})`,
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
              {kind === 'image' ? (
                <div className="content-editor__image-input">
                  <ImageFitSelect onChange={setImageFit} value={imageFit} />
                  <input
                    accept="image/png,image/jpeg,image/bmp"
                    aria-label={t('folderStyle.image')}
                    disabled={processingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        reportImageRejection();
                        return;
                      }
                      setError('');
                      setProcessingImage(true);
                      setAppearanceAnnouncement(
                        t('folderStyle.imageProcessing'),
                      );
                      void optimizeFolderWallpaper(
                        file,
                        allowLargeWallpaperImports,
                      )
                        .then((optimized) => {
                          setImage(optimized);
                          setCropSource(optimized);
                          setCropSession(undefined);
                          setAppearanceAnnouncement(
                            t('folderStyle.imageOptimized'),
                          );
                        })
                        .catch(reportImageRejection)
                        .finally(() => setProcessingImage(false));
                    }}
                    ref={imageInputCancelRef}
                    required={!image}
                    type="file"
                  />
                  {image ? (
                    <>
                      <img alt={t('folderStyle.imagePreview')} src={image} />
                      <button
                        className="content-editor__randomize-button"
                        disabled={saving || processingImage}
                        onClick={() => setCropOpen(true)}
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
            </div>
          </details>
          <details
            className="folder-style__section"
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenSection((current) =>
                isOpen
                  ? 'navigation'
                  : current === 'navigation'
                    ? null
                    : current,
              );
            }}
            open={openSection === 'navigation'}
          >
            <summary>{t('folderStyle.navigationPanel')}</summary>
            <div className="folder-style__section-content">
              <label className="folder-style__navigation-toggle">
                <input
                  checked={includeNavigation}
                  disabled={kind === 'none'}
                  onChange={(event) =>
                    setIncludeNavigation(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t('folderStyle.includeNavigation')}</span>
              </label>
              <label>
                <span>
                  {t('folderStyle.navigationTransparency', {
                    value: transparency,
                  })}
                </span>
                <input
                  disabled={!includeNavigation || kind === 'none'}
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setTransparency(Number(event.target.value))
                  }
                  step={1}
                  type="range"
                  value={transparency}
                />
              </label>
              <p className="content-editor__help">
                {t('folderStyle.navigationHelp')}
              </p>
            </div>
          </details>
          {error ? (
            <p className="content-editor__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <footer>
          <button
            disabled={saving || processingImage || cropOpen}
            onClick={onClose}
            type="button"
          >
            {t('folderStyle.cancel')}
          </button>
          <button
            disabled={saving || processingImage || cropOpen}
            type="submit"
          >
            {saving ? t('folderStyle.saving') : t('folderStyle.save')}
          </button>
        </footer>
      </form>
      {cropOpen && cropSource ? (
        <ImageCropDialog
          initialSession={cropSession}
          onApply={(result, session) => {
            setImage(result);
            setCropSession(session);
            setImageFit('fit');
            setCropOpen(false);
            setAppearanceAnnouncement(t('contentEditor.cropApplied'));
            requestAnimationFrame(() => cropButtonRef.current?.focus());
          }}
          onCancel={() => {
            setCropOpen(false);
            requestAnimationFrame(() => cropButtonRef.current?.focus());
          }}
          source={cropSource}
          onFailure={() => {
            try {
              void Promise.resolve(onCropFailure?.()).catch(() =>
                console.error('folder-wallpaper-crop-diagnostic-failed'),
              );
            } catch {
              console.error('folder-wallpaper-crop-diagnostic-failed');
            }
          }}
        />
      ) : null}
    </dialog>
  );
}
