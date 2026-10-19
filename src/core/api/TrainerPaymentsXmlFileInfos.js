import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async create (payload) {
    return alenviAxios.post(
      `${process.env.API_HOSTNAME}/trainerpaymentsxmlfileinfos`,
      payload,
      { responseType: 'blob', headers: { Accept: 'application/xml' } }
    );
  },
};
