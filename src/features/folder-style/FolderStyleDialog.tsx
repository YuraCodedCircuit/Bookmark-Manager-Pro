import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { ImageFit } from '../../domain/bookmark';
import type { FolderBackgroundAppearance } from '../../domain/folder';
import { parseGradientDirection } from '../../shared/gradient-direction';
import { GradientDirectionControl } from '../../components/GradientDirectionControl';
import { ImageFitSelect } from '../../components/ImageFitSelect';
import type { ProfileSettings } from '../../domain/profile-settings';

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
  onSave: (value: FolderStyleValue) => Promise<void>;
}

/** Edits the local background appearance of the currently open folder. */
export function FolderStyleDialog({
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
  onSave,
}: FolderStyleDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  return (
    <dialog
      aria-labelledby="folder-style-title"
      className="content-editor"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      ref={dialogRef}
    >
      <form onSubmit={(event) => void submit(event)}>
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
            ×
          </button>
        </header>
        <details className="folder-style__section" open>
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
                <option value="details">{t('displaySettings.details')}</option>
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
                <option value="compact">{t('displaySettings.compact')}</option>
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
                <option value="title">{t('displaySettings.itemTitle')}</option>
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
        <details className="folder-style__section">
          <summary>{t('folderStyle.background')}</summary>
          <div className="folder-style__section-content">
            <div className="content-editor__appearance-options">
              {(['none', 'color', 'gradient', 'image'] as const).map(
                (option) => (
                  <label key={option}>
                    <input
                      checked={kind === option}
                      name="folder-style"
                      onChange={() => setKind(option)}
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
              <input
                aria-label={t('folderStyle.color')}
                onChange={(event) => setColor(event.target.value)}
                type="color"
                value={color}
              />
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
                          const next = [...colors] as [string, string, string];
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
              </div>
            ) : null}
            {kind === 'image' ? (
              <div className="content-editor__image-input">
                <ImageFitSelect onChange={setImageFit} value={imageFit} />
                <input
                  accept="image/png,image/jpeg,image/bmp"
                  aria-label={t('folderStyle.image')}
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
                  <img alt={t('folderStyle.imagePreview')} src={image} />
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
        <details className="folder-style__section">
          <summary>{t('folderStyle.navigationPanel')}</summary>
          <div className="folder-style__section-content">
            <label className="folder-style__navigation-toggle">
              <input
                checked={includeNavigation}
                disabled={kind === 'none'}
                onChange={(event) => setIncludeNavigation(event.target.checked)}
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
        <footer>
          <button disabled={saving} onClick={onClose} type="button">
            {t('folderStyle.cancel')}
          </button>
          <button disabled={saving} type="submit">
            {saving ? t('folderStyle.saving') : t('folderStyle.save')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
