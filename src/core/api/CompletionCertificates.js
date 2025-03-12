import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const completionCertificates = await alenviAxios
      .get(`${process.env.API_HOSTNAME}/completioncertificates`, { params });

    return completionCertificates.data.data.completionCertificates;
  },
};
