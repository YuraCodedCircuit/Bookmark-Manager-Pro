import { animate } from 'motion/mini';
import {
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { CreateFirstProfileInput } from '../../application/profile/create-first-profile';
import { usePrefersReducedMotion } from '../../shared/use-prefers-reduced-motion';

interface WelcomeDialogProps {
  isOpen: boolean;
  onCreateProfile: (input: CreateFirstProfileInput) => Promise<void>;
}

type OnboardingStage = 'profile' | 'welcome';

const benefitKeys = ['local', 'customize', 'browsers'] as const;
const acceptedIconTypes = new Set(['image/bmp', 'image/jpeg', 'image/png']);
const maxProfileIconBytes = 1_000_000;

export function WelcomeDialog({ isOpen, onCreateProfile }: WelcomeDialogProps) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<OnboardingStage>('welcome');
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [icon, setIcon] = useState<string>();
  const [iconError, setIconError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const previousDocumentOverflowYRef = useRef<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (isOpen) {
      if (previousDocumentOverflowYRef.current === null) {
        previousDocumentOverflowYRef.current =
          document.documentElement.style.overflowY;
      }
      document.documentElement.style.overflowY = 'hidden';

      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }

      primaryActionRef.current?.focus();
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    return () => {
      if (previousDocumentOverflowYRef.current !== null) {
        document.documentElement.style.overflowY =
          previousDocumentOverflowYRef.current;
        previousDocumentOverflowYRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (stage !== 'profile') {
      return;
    }

    usernameRef.current?.focus();
    const content = contentRef.current;

    if (
      content === null ||
      prefersReducedMotion ||
      typeof content.animate !== 'function'
    ) {
      return;
    }

    const entrance = animate(
      content,
      { opacity: [0, 1], transform: ['translateX(1rem)', 'translateX(0)'] },
      { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    );

    return () => entrance.stop();
  }, [prefersReducedMotion, stage]);

  const transitionToProfile = async () => {
    const content = contentRef.current;

    if (
      content !== null &&
      !prefersReducedMotion &&
      typeof content.animate === 'function'
    ) {
      await animate(
        content,
        { opacity: [1, 0], transform: ['translateX(0)', 'translateX(-1rem)'] },
        { duration: 0.14, ease: [0.4, 0, 1, 1] },
      );
    }

    setStage('profile');
  };

  const selectIcon = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setIconError(undefined);

    if (file === undefined) {
      return;
    }

    if (!acceptedIconTypes.has(file.type)) {
      setIconError(t('welcome.profile.iconTypeError'));
      event.target.value = '';
      return;
    }

    if (file.size > maxProfileIconBytes) {
      setIconError(t('welcome.profile.iconSizeError'));
      event.target.value = '';
      return;
    }

    try {
      setIcon(await readFileAsDataUrl(file));
    } catch {
      setIconError(t('welcome.profile.iconReadError'));
      event.target.value = '';
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '').trim();

    if (username.length === 0) {
      usernameRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      await onCreateProfile({
        ...(icon === undefined ? {} : { icon }),
        username,
      });
    } catch {
      setSubmitError(t('welcome.profile.createError'));
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      aria-describedby={
        stage === 'welcome'
          ? 'welcome-summary welcome-privacy'
          : 'profile-summary profile-note'
      }
      aria-labelledby={stage === 'welcome' ? 'welcome-title' : 'profile-title'}
      className="welcome-dialog"
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
    >
      <div aria-hidden="true" className="welcome-dialog__visual">
        <div className="welcome-dialog__glow" />
        <img alt="" src="/extension-icon.png" />
      </div>

      <div className="welcome-dialog__content" ref={contentRef}>
        {stage === 'welcome' ? (
          <WelcomeContent
            isLearnMoreOpen={isLearnMoreOpen}
            onLearnMore={() => setIsLearnMoreOpen((isOpen) => !isOpen)}
            onNext={() => void transitionToProfile()}
            primaryActionRef={primaryActionRef}
          />
        ) : (
          <form className="profile-setup" onSubmit={submitProfile}>
            <h1 id="profile-title">{t('welcome.profile.title')}</h1>
            <p className="welcome-dialog__summary" id="profile-summary">
              {t('welcome.profile.summary')}
            </p>

            <div className="profile-setup__fields">
              <label className="profile-setup__field">
                <span>{t('welcome.profile.username')}</span>
                <input
                  autoComplete="username"
                  maxLength={80}
                  name="username"
                  placeholder={t('welcome.profile.usernamePlaceholder')}
                  ref={usernameRef}
                  required
                  type="text"
                />
              </label>

              <div className="profile-setup__icon-field">
                <span>{t('welcome.profile.icon')}</span>
                <div className="profile-setup__icon-row">
                  <div className="profile-setup__icon-preview">
                    {icon === undefined ? <ProfilePlaceholderIcon /> : null}
                    {icon === undefined ? null : (
                      <img alt={t('welcome.profile.iconPreview')} src={icon} />
                    )}
                  </div>
                  <div className="profile-setup__icon-actions">
                    <label className="profile-setup__upload">
                      {t('welcome.profile.chooseIcon')}
                      <input
                        accept=".bmp,image/bmp,image/jpeg,image/png"
                        onChange={(event) => void selectIcon(event)}
                        type="file"
                      />
                    </label>
                    {icon === undefined ? null : (
                      <button
                        className="profile-setup__remove"
                        onClick={() => setIcon(undefined)}
                        type="button"
                      >
                        {t('welcome.profile.removeIcon')}
                      </button>
                    )}
                    <small>{t('welcome.profile.iconHelp')}</small>
                  </div>
                </div>
                {iconError === undefined ? null : (
                  <small className="profile-setup__error" role="alert">
                    {iconError}
                  </small>
                )}
              </div>
            </div>

            <p className="profile-setup__note" id="profile-note">
              {t('welcome.profile.note')}
            </p>
            {submitError === undefined ? null : (
              <p className="profile-setup__error" role="alert">
                {submitError}
              </p>
            )}

            <div className="welcome-dialog__actions">
              <button
                className="welcome-dialog__primary"
                disabled={isSubmitting}
                type="submit"
              >
                {t(
                  isSubmitting
                    ? 'welcome.profile.creating'
                    : 'welcome.profile.create',
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

interface WelcomeContentProps {
  isLearnMoreOpen: boolean;
  onLearnMore: () => void;
  onNext: () => void;
  primaryActionRef: RefObject<HTMLButtonElement | null>;
}

function WelcomeContent({
  isLearnMoreOpen,
  onLearnMore,
  onNext,
  primaryActionRef,
}: WelcomeContentProps) {
  const { t } = useTranslation();

  return (
    <>
      <h1 id="welcome-title">{t('welcome.title')}</h1>
      <p className="welcome-dialog__summary" id="welcome-summary">
        {t('welcome.summary')}
      </p>

      <ul className="welcome-dialog__benefits">
        {benefitKeys.map((benefit) => (
          <li key={benefit}>
            <span aria-hidden="true" className="welcome-dialog__marker" />
            <span>
              <strong>{t(`welcome.benefits.${benefit}.title`)}</strong>
              <small>{t(`welcome.benefits.${benefit}.description`)}</small>
            </span>
          </li>
        ))}
      </ul>

      <p className="welcome-dialog__privacy" id="welcome-privacy">
        {t('welcome.privacy')}
      </p>

      {isLearnMoreOpen ? (
        <p className="welcome-dialog__details" id="welcome-details">
          {t('welcome.details')}
        </p>
      ) : null}

      <div className="welcome-dialog__actions">
        <button
          className="welcome-dialog__primary"
          onClick={onNext}
          ref={primaryActionRef}
          type="button"
        >
          {t('welcome.getStarted')}
        </button>
        <button
          aria-controls="welcome-details"
          aria-expanded={isLearnMoreOpen}
          className="welcome-dialog__secondary"
          onClick={onLearnMore}
          type="button"
        >
          {t(isLearnMoreOpen ? 'welcome.showLess' : 'welcome.learnMore')}
        </button>
      </div>
    </>
  );
}

function ProfilePlaceholderIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.5-4 2.6-6 6.5-6s6 2 6.5 6" />
    </svg>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('error', () => reject(reader.error));
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('profile-icon-read-failed'));
      }
    });
    reader.readAsDataURL(file);
  });
}
