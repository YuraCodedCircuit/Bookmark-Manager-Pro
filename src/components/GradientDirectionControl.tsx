import { useTranslation } from 'react-i18next';

interface GradientDirectionControlProps {
  onChange: (value: string) => void;
  value: string;
}

/** Synchronized exact and visual controls for an untrusted gradient angle. */
export function GradientDirectionControl({
  onChange,
  value,
}: GradientDirectionControlProps) {
  const { t } = useTranslation();
  const sliderValue = /^\d{1,3}$/.test(value)
    ? Math.min(Number(value), 359)
    : 0;

  return (
    <div className="gradient-direction-control">
      <label>
        <span>{t('contentEditor.gradientDirection')}</span>
        <input
          inputMode="numeric"
          max={359}
          min={0}
          onChange={(event) => onChange(event.target.value)}
          required
          step={1}
          type="number"
          value={value}
        />
      </label>
      <input
        aria-label={t('contentEditor.gradientDirectionSlider')}
        max={359}
        min={0}
        onChange={(event) => onChange(event.target.value)}
        step={1}
        type="range"
        value={sliderValue}
      />
    </div>
  );
}
