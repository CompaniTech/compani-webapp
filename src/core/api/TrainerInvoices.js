import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/trainerinvoices`, payload);
  },
  async update (trainerInvoiceId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/trainerinvoices/${trainerInvoiceId}`, payload);
  },
  async remove (trainerInvoiceId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/trainerinvoices/${trainerInvoiceId}`);
  },
};
