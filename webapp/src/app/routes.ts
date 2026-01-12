export const routes = {
  home: () => '/',
  diagnoses: () => '/diagnoses',
  diagnosis: (id: string) => `/diagnoses/${id}`,
  diagnosisGroup: (id: string) => `/diagnoses/group/${id}`,
  medications: () => '/medications',
  medication: (id: string) => `/medications/${id}`,
  visit: () => '/visit'
} as const;
