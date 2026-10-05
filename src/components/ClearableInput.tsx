import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';

import { ClearIcon } from './icons/ClearIcon';

type ClearableInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  clearLabel?: string | undefined;
  type?: 'search' | 'text' | 'url' | undefined;
};

/** Adds an adjacent clear action to an editable single-line text input. */
export const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(
  function ClearableInput(
    {
      clearLabel,
      defaultValue,
      disabled,
      onChange,
      readOnly,
      value,
      ...inputProps
    },
    forwardedRef,
  ) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [hasValue, setHasValue] = useState(
      () => String(value ?? defaultValue ?? '').length > 0,
    );

    useImperativeHandle(
      forwardedRef,
      () => inputRef.current as HTMLInputElement,
    );
    useEffect(() => {
      if (value !== undefined) setHasValue(String(value).length > 0);
    }, [value]);

    return (
      <span className="clearable-input">
        <input
          {...inputProps}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={(event) => {
            setHasValue(event.currentTarget.value.length > 0);
            onChange?.(event);
          }}
          readOnly={readOnly}
          ref={inputRef}
          value={value}
        />
        {hasValue && !disabled && !readOnly ? (
          <button
            aria-label={clearLabel ?? t('editableContextMenu.clearInput')}
            className="clearable-input__button"
            onClick={() => {
              const input = inputRef.current;
              if (!input) return;
              const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                'value',
              )?.set;
              valueSetter?.call(input, '');
              input.dispatchEvent(new Event('input', { bubbles: true }));
              setHasValue(false);
              input.focus({ preventScroll: true });
            }}
            type="button"
          >
            <ClearIcon />
          </button>
        ) : null}
      </span>
    );
  },
);
