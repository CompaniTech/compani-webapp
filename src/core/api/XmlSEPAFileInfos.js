import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async download (payload) {
    return alenviAxios.post(`${process.env.API_HOSTNAME}/xmlsepafileinfos`, payload);
  },
};
