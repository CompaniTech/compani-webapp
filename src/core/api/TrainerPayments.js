import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const trainerPayments = await alenviAxios.get(`${process.env.API_HOSTNAME}/trainerpayments`, { params });

    return trainerPayments.data.data.trainerPayments;
  },
  async update (trainerPaymentId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/trainerpayments/${trainerPaymentId}`, payload);
  },
  async remove (trainerPaymentId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/trainerpayments/${trainerPaymentId}`);
  },
};
