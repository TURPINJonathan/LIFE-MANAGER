import { SettingsPage } from '@pages';
import { appTitle } from '@constants';

const SECTION_TITLES: Record<string, string> = {
  profil: 'Profil',
  comptes: 'Comptes',
  categories: 'Catégories',
  enseignes: 'Enseignes',
};

export function meta({ params }: { params: { section?: string } }) {
  const sectionTitle = params.section ? SECTION_TITLES[params.section] : undefined;
  return [{ title: appTitle(sectionTitle, 'Paramètres') }];
}

export default function SettingsSectionRoute() {
  return <SettingsPage />;
}
