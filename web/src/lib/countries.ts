// Pays proposés dans le sélecteur d'indicatif téléphonique — centré sur le
// marché cible (Afrique de l'Ouest/Centrale) avec quelques pays majeurs de la
// diaspora. Miroir de packages/tontine_core/lib/src/util/countries.dart (côté
// Flutter) — garder les deux listes synchronisées si l'une évolue.

export interface Country {
  iso2: string;
  name: string;
  dialCode: string; // avec le "+", ex. "+226"
  flag: string;
}

export const DEFAULT_COUNTRY: Country = { iso2: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' };

export const COUNTRIES: Country[] = [
  DEFAULT_COUNTRY,
  { iso2: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { iso2: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { iso2: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { iso2: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { iso2: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { iso2: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { iso2: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { iso2: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { iso2: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { iso2: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { iso2: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { iso2: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬' },
  { iso2: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { iso2: 'CF', name: 'Centrafrique', dialCode: '+236', flag: '🇨🇫' },
  { iso2: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { iso2: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },
  { iso2: 'GW', name: 'Guinée-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { iso2: 'GM', name: 'Gambie', dialCode: '+220', flag: '🇬🇲' },
  { iso2: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
  { iso2: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
  { iso2: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { iso2: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿' },
  { iso2: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { iso2: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { iso2: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { iso2: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { iso2: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { iso2: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { iso2: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { iso2: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { iso2: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { iso2: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { iso2: 'CN', name: 'Chine', dialCode: '+86', flag: '🇨🇳' },
  { iso2: 'AE', name: 'Émirats arabes unis', dialCode: '+971', flag: '🇦🇪' },
];
