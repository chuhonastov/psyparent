export const routes = {
  home: '/',
  diagnoses: '/diagnoses',
  diagnosis: (id: string) => `/diagnoses/${id}`,
  diagnosisGroup: (id: string) => `/diagnoses/group/${id}`,
  medications: '/medications',
  medicationGroup: (id: string) => `/medications/group/${id}`,
  medication: (id: string) => `/medications/${id}`,
  visit: '/visit'
} as const;
