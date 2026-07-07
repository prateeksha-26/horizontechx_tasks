import { api } from './client';

export const recapApi = {
  list: () => api.getRecaps(),
  get: (id) => api.getRecap(id),
};
