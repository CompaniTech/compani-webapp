import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const completionCertificates = await alenviAxios
      .get(`${process.env.API_HOSTNAME}/completioncertificates`, { params });

    return completionCertificates.data.data.completionCertificates;
  },
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/completioncertificates`, payload);
  },
  async update (completionCertificateId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/completioncertificates/${completionCertificateId}`, payload);
  },
  async deleteFile (completionCertificateId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/completioncertificates/${completionCertificateId}/file`);
  },
};
