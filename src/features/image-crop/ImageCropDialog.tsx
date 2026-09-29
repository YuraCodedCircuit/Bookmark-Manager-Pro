import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  centeredCrop,
  changeCropShape,
  clampCrop,
  moveCrop,
  resizeCrop,
  roundedCrop,
  zoomCrop,
  type CropHandle,
  type CropRect,
  type CropShape,
  type ImageDimensions,
} from './crop-geometry';
import {
  inspectCropSource,
  MAX_CROP_OUTPUT_EDGE,
  processCroppedImage,
} from './process-cropped-image';

export interface ImageCropSession {
  crop: CropRect;
  shape: CropShape;
  zoom: number;
}

interface ImageCropDialogProps {
  initialSession?: ImageCropSession | undefined;
  onApply(result: string, session: ImageCropSession): void;
  onCancel(): void;
  onFailure?(): void;
  source: string;
}

interface PointerOperation {
  crop: CropRect;
  handle: CropHandle | undefined;
  pointerId: number;
  x: number;
  y: number;
}

const handles: CropHandle[] = [
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
];

function outputDimensions(crop: CropRect): ImageDimensions {
  const scale = Math.min(
    1,
    MAX_CROP_OUTPUT_EDGE / crop.width,
    MAX_CROP_OUTPUT_EDGE / crop.height,
  );
  return {
    height: Math.max(1, Math.round(crop.height * scale)),
    width: Math.max(1, Math.round(crop.width * scale)),
  };
}

/** Edits a transient image crop without reading or writing durable storage. */
export function ImageCropDialog({
  initialSession,
  onApply,
  onCancel,
  onFailure,
  source,
}: ImageCropDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerOperationRef = useRef<PointerOperation | undefined>(undefined);
  const [dimensions, setDimensions] = useState<ImageDimensions>();
  const [shape, setShape] = useState<CropShape>(
    initialSession?.shape ?? 'card',
  );
  const [crop, setCrop] = useState<CropRect | undefined>(initialSession?.crop);
  const [zoom, setZoom] = useState(initialSession?.zoom ?? 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    void inspectCropSource(source)
      .then((nextDimensions) => {
        if (!active) return;
        setDimensions(nextDimensions);
        setCrop((current) =>
          current
            ? clampCrop(current, nextDimensions)
            : centeredCrop(nextDimensions, shape),
        );
      })
      .catch(() => {
        if (!active) return;
        setError(t('contentEditor.crop.error'));
        onFailure?.();
      });
    return () => {
      active = false;
    };
  }, [onFailure, shape, source, t]);

  const reset = () => {
    if (!dimensions) return;
    setCrop(centeredCrop(dimensions, shape));
    setZoom(1);
    setError('');
  };

  const updateShape = (nextShape: CropShape) => {
    setShape(nextShape);
    setCrop((current) =>
      current ? changeCropShape(current, nextShape) : current,
    );
  };

  const updateCropField = (field: keyof CropRect, value: number) => {
    if (!dimensions || !crop) return;
    if (field === 'width' || field === 'height') setShape('free');
    setCrop(clampCrop({ ...crop, [field]: value }, dimensions));
  };

  const updateZoom = (nextZoom: number) => {
    if (!dimensions || !crop) return;
    setCrop(zoomCrop(crop, zoom, nextZoom, dimensions));
    setZoom(nextZoom);
  };

  const keyboardDelta = (
    event: KeyboardEvent,
  ): [number, number] | undefined => {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') return [-step, 0];
    if (event.key === 'ArrowRight') return [step, 0];
    if (event.key === 'ArrowUp') return [0, -step];
    if (event.key === 'ArrowDown') return [0, step];
    return undefined;
  };

  const onCropKeyDown = (event: KeyboardEvent) => {
    const delta = keyboardDelta(event);
    if (!delta || !crop || !dimensions) return;
    event.preventDefault();
    setCrop(moveCrop(crop, delta[0], delta[1], dimensions));
  };

  const onHandleKeyDown = (event: KeyboardEvent, handle: CropHandle) => {
    const delta = keyboardDelta(event);
    if (!delta || !crop || !dimensions) return;
    event.preventDefault();
    event.stopPropagation();
    setShape('free');
    setCrop(resizeCrop(crop, handle, delta[0], delta[1], dimensions));
  };

  const beginPointerOperation = (event: PointerEvent, handle?: CropHandle) => {
    if (!crop || isProcessing) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerOperationRef.current = {
      crop,
      handle,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const continuePointerOperation = (event: PointerEvent) => {
    const operation = pointerOperationRef.current;
    const stage = stageRef.current;
    if (
      !operation ||
      operation.pointerId !== event.pointerId ||
      !stage ||
      !dimensions
    )
      return;
    const bounds = stage.getBoundingClientRect();
    const deltaX =
      ((event.clientX - operation.x) / bounds.width) * dimensions.width;
    const deltaY =
      ((event.clientY - operation.y) / bounds.height) * dimensions.height;
    if (operation.handle) setShape('free');
    setCrop(
      operation.handle
        ? resizeCrop(
            operation.crop,
            operation.handle,
            deltaX,
            deltaY,
            dimensions,
          )
        : moveCrop(operation.crop, deltaX, deltaY, dimensions),
    );
  };

  const endPointerOperation = (event: PointerEvent) => {
    if (pointerOperationRef.current?.pointerId === event.pointerId) {
      pointerOperationRef.current = undefined;
    }
  };

  const apply = async () => {
    if (!crop || !dimensions || isProcessing) return;
    setIsProcessing(true);
    setError('');
    try {
      const finalCrop = roundedCrop(clampCrop(crop, dimensions));
      const result = await processCroppedImage(source, finalCrop);
      onApply(result, { crop: finalCrop, shape, zoom });
    } catch {
      setError(t('contentEditor.crop.error'));
      onFailure?.();
      setIsProcessing(false);
    }
  };

  const output = crop ? outputDimensions(crop) : undefined;
  const cropStyle =
    crop && dimensions
      ? {
          height: `${(crop.height / dimensions.height) * 100}%`,
          left: `${(crop.x / dimensions.width) * 100}%`,
          top: `${(crop.y / dimensions.height) * 100}%`,
          width: `${(crop.width / dimensions.width) * 100}%`,
        }
      : undefined;

  return (
    <dialog
      aria-labelledby="crop-image-title"
      className="crop-image-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!isProcessing) onCancel();
      }}
      ref={dialogRef}
    >
      <header className="crop-image-dialog__header">
        <h2 id="crop-image-title" ref={headingRef} tabIndex={-1}>
          {t('contentEditor.crop.title')}
        </h2>
      </header>
      <div className="crop-image-dialog__workspace">
        <div className="crop-image-dialog__viewport">
          {dimensions && crop ? (
            <div
              className="crop-image-dialog__stage"
              ref={stageRef}
              style={{
                aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                width: '100%',
              }}
            >
              <img alt="" draggable={false} src={source} />
              <div className="crop-image-dialog__shade" />
              <div
                aria-describedby="crop-image-instructions"
                aria-label={t('contentEditor.crop.region')}
                className="crop-image-dialog__selection"
                onKeyDown={onCropKeyDown}
                onPointerCancel={endPointerOperation}
                onPointerDown={(event) => beginPointerOperation(event)}
                onPointerMove={continuePointerOperation}
                onPointerUp={endPointerOperation}
                role="group"
                style={cropStyle}
                tabIndex={0}
              >
                <span className="crop-image-dialog__thirds crop-image-dialog__thirds--vertical" />
                <span className="crop-image-dialog__thirds crop-image-dialog__thirds--horizontal" />
                {handles.map((handle) => (
                  <button
                    aria-label={t('contentEditor.crop.resizeHandle', {
                      direction: t(`contentEditor.crop.directions.${handle}`),
                    })}
                    className={`crop-image-dialog__handle crop-image-dialog__handle--${handle}`}
                    key={handle}
                    onKeyDown={(event) => onHandleKeyDown(event, handle)}
                    onPointerCancel={endPointerOperation}
                    onPointerDown={(event) =>
                      beginPointerOperation(event, handle)
                    }
                    onPointerMove={continuePointerOperation}
                    onPointerUp={endPointerOperation}
                    type="button"
                  />
                ))}
              </div>
            </div>
          ) : (
            <p role="status">{t('contentEditor.crop.loading')}</p>
          )}
        </div>
        <div className="crop-image-dialog__controls">
          <p className="visually-hidden" id="crop-image-instructions">
            {t('contentEditor.crop.instructions')}
          </p>
          <label>
            <span>{t('contentEditor.crop.shape')}</span>
            <select
              disabled={!crop || isProcessing}
              onChange={(event) => updateShape(event.target.value as CropShape)}
              value={shape}
            >
              {(['card', 'free', 'square', 'landscape'] as const).map(
                (option) => (
                  <option key={option} value={option}>
                    {t(`contentEditor.crop.shapes.${option}`)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>{t('contentEditor.crop.zoom')}</span>
            <input
              disabled={!crop || isProcessing}
              max="3"
              min="1"
              onChange={(event) => updateZoom(Number(event.target.value))}
              step="0.1"
              type="range"
              value={zoom}
            />
          </label>
          <fieldset disabled={!crop || isProcessing}>
            <legend>{t('contentEditor.crop.precise')}</legend>
            <div className="crop-image-dialog__geometry">
              {(['x', 'y', 'width', 'height'] as const).map((field) => (
                <label key={field}>
                  <span>{t(`contentEditor.crop.fields.${field}`)}</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      updateCropField(field, Number(event.target.value))
                    }
                    step="1"
                    type="number"
                    value={crop ? Math.round(crop[field]) : 0}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          {output ? (
            <p className="crop-image-dialog__output">
              {t('contentEditor.crop.output', {
                height: output.height,
                width: output.width,
              })}
            </p>
          ) : null}
          {error ? (
            <p className="crop-image-dialog__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <footer className="crop-image-dialog__footer">
        <button disabled={isProcessing} onClick={onCancel} type="button">
          {t('contentEditor.crop.cancel')}
        </button>
        <button disabled={!crop || isProcessing} onClick={reset} type="button">
          {t('contentEditor.crop.reset')}
        </button>
        <button
          disabled={!crop || isProcessing}
          onClick={() => void apply()}
          type="button"
        >
          {isProcessing
            ? t('contentEditor.crop.applying')
            : t('contentEditor.crop.apply')}
        </button>
      </footer>
    </dialog>
  );
}
