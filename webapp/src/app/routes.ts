export const routes = {
  home: '/',
  diagnoses: '/diagnoses',
  diagnosis: (id: string) => `/diagnoses/${id}`,
  medications: '/medications',
  medication: (id: string) => `/medications/${id}`,
  visit: '/visit',
} as const;
