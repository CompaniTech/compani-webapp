import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async getCompletionCertificates (params) {
    console.log('params', params);
    const completionCertificates = await alenviAxios.get(
      `${process.env.API_HOSTNAME}/completioncertificates`,
      { params }
    );
    console.log('certificate', completionCertificates);
    return completionCertificates.data.data.completionCertificates;
  },
};
