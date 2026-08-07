import { useState } from 'react';
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '../lib/countries';
import './phone-input.css';

interface PhoneInputProps {
  /** Numéro complet au format international (ex. "+22670000000") — c'est
   * cette valeur que le formulaire appelant continue de lire/soumettre. */
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  required?: boolean;
}

function parseValue(value: string): { country: Country; local: string } {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    const byLongestCode = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = byLongestCode.find((c) => trimmed.startsWith(c.dialCode));
    if (match) return { country: match, local: trimmed.slice(match.dialCode.length) };
  }
  return { country: DEFAULT_COUNTRY, local: '' };
}

export default function PhoneInput({ value, onChange, autoFocus, required }: PhoneInputProps) {
  const [{ country, local }, setState] = useState(() => parseValue(value));

  function update(nextCountry: Country, nextLocal: string) {
    setState({ country: nextCountry, local: nextLocal });
    // Un "0" initial est un préfixe de composition local, pas un chiffre du
    // numéro international (ex. "070000000" → "+22670000000").
    const cleaned = nextLocal.startsWith('0') ? nextLocal.slice(1) : nextLocal;
    onChange(`${nextCountry.dialCode}${cleaned}`);
  }

  return (
    <div className="phone-input">
      <select
        className="phone-input-country"
        value={country.iso2}
        onChange={(e) => {
          const next = COUNTRIES.find((c) => c.iso2 === e.target.value) ?? DEFAULT_COUNTRY;
          update(next, local);
        }}
        aria-label="Indicatif pays"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.flag} {c.dialCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        className="phone-input-local"
        placeholder="70 00 00 00"
        value={local}
        onChange={(e) => update(country, e.target.value.replace(/[^\d\s]/g, ''))}
        autoFocus={autoFocus}
        required={required}
      />
    </div>
  );
}
