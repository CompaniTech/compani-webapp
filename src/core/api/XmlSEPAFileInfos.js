import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async create (payload) {
    return alenviAxios.post(
      `${process.env.API_HOSTNAME}/xmlsepafileinfos`,
      payload,
      { responseType: 'blob', headers: { Accept: 'application/xml' } }
    );
  },
};
