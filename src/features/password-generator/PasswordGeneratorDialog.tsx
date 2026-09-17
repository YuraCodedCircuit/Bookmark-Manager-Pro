import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { ClearIcon } from '../../components/icons/ClearIcon';
import { CopyIcon } from '../../components/icons/CopyIcon';
import {
  countRequiredCharacterGroups,
  defaultPasswordGeneratorOptions,
  evaluatePasswordStrength,
  generateRandomPassword,
  passwordLengthLimits,
  type PasswordGeneratorOptions,
} from '../../domain/password-generator';
import {
  useMotionPreference,
  usePrefersReducedMotion,
} from '../../shared/use-prefers-reduced-motion';

const revealCharacters =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*?';
const fullRevealDurationMs = 600;
const reducedRevealDurationMs = 150;

/** Returns a temporary reveal frame without exposing the unrevealed characters. */
function createRevealFrame(password: string, revealedCount: number) {
  const randomValues = new Uint32Array(password.length - revealedCount);
  globalThis.crypto.getRandomValues(randomValues);
  return (
    password.slice(0, revealedCount) +
    Array.from(
      randomValues,
      (value) => revealCharacters[value % revealCharacters.length],
    ).join('')
  );
}

interface PasswordGeneratorDialogProps {
  isOpen: boolean;
  onClose(): void;
  onCopy(password: string): Promise<void>;
  onFailure(kind: 'clipboard' | 'generation'): void;
  onGenerated(): void;
  onValidationFailure(requiredLength: number): void;
}

/** Renders a transient password generator that never persists generated values. */
export function PasswordGeneratorDialog({
  isOpen,
  onClose,
  onCopy,
  onFailure,
  onGenerated,
  onValidationFailure,
}: PasswordGeneratorDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const hasFocusedOnOpenRef = useRef(false);
  const revealTimeoutsRef = useRef<number[]>([]);
  const [options, setOptions] = useState(defaultPasswordGeneratorOptions);
  const [password, setPassword] = useState('');
  const [displayPassword, setDisplayPassword] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const strength = password ? evaluatePasswordStrength(password) : undefined;
  const requiredGroups = countRequiredCharacterGroups(options);
  const lengthTooShort = options.length < requiredGroups;
  const baseOptionCount =
    Number(options.lowercase) +
    Number(options.uppercase) +
    Number(options.numbers);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionPreference = useMotionPreference();

  const clearReveal = useCallback(() => {
    revealTimeoutsRef.current.forEach((timeout) =>
      window.clearTimeout(timeout),
    );
    revealTimeoutsRef.current = [];
  }, []);

  const reveal = useCallback(
    (nextPassword: string) => {
      clearReveal();
      const duration =
        motionPreference === 'none'
          ? 0
          : prefersReducedMotion || motionPreference === 'reduced'
            ? reducedRevealDurationMs
            : fullRevealDurationMs;
      if (duration === 0) {
        setDisplayPassword(nextPassword);
        setIsRevealing(false);
        return;
      }

      setIsRevealing(true);
      setDisplayPassword(createRevealFrame(nextPassword, 0));
      for (
        let revealedCount = 1;
        revealedCount <= nextPassword.length;
        revealedCount += 1
      ) {
        const timeout = window.setTimeout(
          () => {
            setDisplayPassword(createRevealFrame(nextPassword, revealedCount));
            if (revealedCount === nextPassword.length) {
              revealTimeoutsRef.current = [];
              setIsRevealing(false);
            }
          },
          (duration / nextPassword.length) * revealedCount,
        );
        revealTimeoutsRef.current.push(timeout);
      }
    },
    [clearReveal, motionPreference, prefersReducedMotion],
  );

  const generate = useCallback(() => {
    if (lengthTooShort) {
      const message = t('passwordGenerator.lengthTooShort', {
        count: requiredGroups,
      });
      setError(message);
      setAnnouncement(message);
      onValidationFailure(requiredGroups);
      return;
    }
    try {
      const nextPassword = generateRandomPassword(options);
      const nextStrength = evaluatePasswordStrength(nextPassword);
      setPassword(nextPassword);
      reveal(nextPassword);
      setIsStale(false);
      setError(undefined);
      setAnnouncement(
        t('passwordGenerator.generatedAnnouncement', {
          strength: t(`passwordGenerator.strength.${nextStrength.label}`),
        }),
      );
      onGenerated();
    } catch {
      clearReveal();
      setPassword('');
      setDisplayPassword('');
      setIsRevealing(false);
      setIsStale(false);
      setError(t('passwordGenerator.generationFailed'));
      setAnnouncement(t('passwordGenerator.generationFailed'));
      onFailure('generation');
    }
  }, [
    clearReveal,
    lengthTooShort,
    onFailure,
    onGenerated,
    onValidationFailure,
    options,
    requiredGroups,
    reveal,
    t,
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      hasFocusedOnOpenRef.current = false;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      const frame = requestAnimationFrame(() => {
        setOptions(defaultPasswordGeneratorOptions);
        setError(undefined);
        setIsStale(false);
        try {
          const initialPassword = generateRandomPassword(
            defaultPasswordGeneratorOptions,
          );
          const initialStrength = evaluatePasswordStrength(initialPassword);
          setPassword(initialPassword);
          reveal(initialPassword);
          setAnnouncement(
            t('passwordGenerator.generatedAnnouncement', {
              strength: t(
                `passwordGenerator.strength.${initialStrength.label}`,
              ),
            }),
          );
        } catch {
          clearReveal();
          setPassword('');
          setDisplayPassword('');
          setIsRevealing(false);
          setError(t('passwordGenerator.generationFailed'));
          onFailure('generation');
        }
      });
      return () => cancelAnimationFrame(frame);
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [clearReveal, isOpen, onFailure, reveal, t]);

  useEffect(() => clearReveal, [clearReveal]);

  useEffect(() => {
    if (!isOpen || !password || isRevealing || hasFocusedOnOpenRef.current)
      return;
    copyButtonRef.current?.focus();
    hasFocusedOnOpenRef.current = true;
  }, [isOpen, isRevealing, password]);

  const updateOptions = (update: Partial<PasswordGeneratorOptions>) => {
    setOptions((current) => ({ ...current, ...update }));
    if (password) setIsStale(true);
    setError(undefined);
    setAnnouncement('');
  };

  const close = () => {
    clearReveal();
    setPassword('');
    setDisplayPassword('');
    setIsRevealing(false);
    setAnnouncement('');
    setOptions(defaultPasswordGeneratorOptions);
    setIsStale(false);
    setError(undefined);
    hasFocusedOnOpenRef.current = false;
    onClose();
  };

  return (
    <dialog
      aria-labelledby="password-generator-title"
      className="profile-window password-generator"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) close();
      }}
      ref={dialogRef}
    >
      <header className="profile-window__header">
        <div>
          <h1 id="password-generator-title">{t('passwordGenerator.title')}</h1>
          <p>{t('passwordGenerator.description')}</p>
        </div>
        <button
          aria-label={t('passwordGenerator.close')}
          onClick={close}
          type="button"
        >
          <ClearIcon />
        </button>
      </header>

      <div className="password-generator__content">
        <div className="password-generator__output">
          <div
            aria-label={t('passwordGenerator.output')}
            aria-readonly="true"
            className="password-generator__password-scroll"
            role="textbox"
            tabIndex={0}
          >
            <span>{displayPassword}</span>
          </div>
          <button
            aria-label={t('passwordGenerator.copy')}
            disabled={!password || isStale || isRevealing}
            onClick={() => {
              void onCopy(password).catch(() => {
                setError(t('passwordGenerator.copyFailed'));
                setAnnouncement(t('passwordGenerator.copyFailed'));
                onFailure('clipboard');
              });
            }}
            ref={copyButtonRef}
            type="button"
          >
            <CopyIcon />
          </button>
        </div>

        {strength ? (
          <div className="password-generator__strength">
            <span>{t('passwordGenerator.strengthLabel')}</span>
            <strong>{t(`passwordGenerator.strength.${strength.label}`)}</strong>
            <progress
              aria-label={t('passwordGenerator.strengthLabel')}
              max="100"
              style={
                {
                  '--password-strength-color': strength.color,
                } as CSSProperties
              }
              value={strength.value}
            />
          </div>
        ) : null}

        <fieldset className="password-generator__length">
          <legend>{t('passwordGenerator.characters')}</legend>
          <input
            aria-label={t('passwordGenerator.charactersSlider')}
            max={passwordLengthLimits.maximum}
            min={passwordLengthLimits.minimum}
            onChange={(event) =>
              updateOptions({ length: Number(event.currentTarget.value) })
            }
            type="range"
            value={options.length}
          />
          <input
            aria-label={t('passwordGenerator.charactersNumber')}
            inputMode="numeric"
            max={passwordLengthLimits.maximum}
            min={passwordLengthLimits.minimum}
            onChange={(event) => {
              const length = event.currentTarget.valueAsNumber;
              if (Number.isFinite(length)) updateOptions({ length });
            }}
            type="number"
            value={options.length}
          />
        </fieldset>

        <fieldset className="password-generator__options">
          <legend>{t('passwordGenerator.characterSets')}</legend>
          {(['lowercase', 'uppercase', 'numbers'] as const).map((option) => (
            <label key={option}>
              <input
                checked={options[option]}
                disabled={options[option] && baseOptionCount === 1}
                onChange={(event) =>
                  updateOptions({ [option]: event.currentTarget.checked })
                }
                type="checkbox"
              />
              {t(`passwordGenerator.options.${option}`)}
            </label>
          ))}
          <label>
            <input
              checked={options.excludeAmbiguous}
              onChange={(event) =>
                updateOptions({
                  excludeAmbiguous: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            {t('passwordGenerator.options.excludeAmbiguous')}
          </label>
        </fieldset>

        <fieldset className="password-generator__symbols">
          <legend>{t('passwordGenerator.symbolSet')}</legend>
          <div>
            {(['none', 'safe', 'all'] as const).map((symbolSet) => (
              <label key={symbolSet}>
                <input
                  checked={options.symbolSet === symbolSet}
                  name="password-symbol-set"
                  onChange={() => updateOptions({ symbolSet })}
                  type="radio"
                />
                <span>{t(`passwordGenerator.symbols.${symbolSet}`)}</span>
              </label>
            ))}
          </div>
          <p>{t(`passwordGenerator.symbolHelp.${options.symbolSet}`)}</p>
        </fieldset>

        <div aria-live="polite" className="password-generator__status">
          {lengthTooShort ? (
            <p className="password-generator__error">
              {t('passwordGenerator.lengthTooShort', {
                count: requiredGroups,
              })}
            </p>
          ) : error ? (
            <p className="password-generator__error" role="alert">
              {error}
            </p>
          ) : isStale ? (
            <p>{t('passwordGenerator.optionsChanged')}</p>
          ) : null}
          <span className="visually-hidden">{announcement}</span>
        </div>
      </div>

      <footer className="password-generator__actions">
        <button onClick={close} type="button">
          {t('passwordGenerator.cancel')}
        </button>
        <button onClick={generate} type="submit">
          {t('passwordGenerator.generate')}
        </button>
      </footer>
    </dialog>
  );
}
