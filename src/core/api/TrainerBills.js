import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/trainerbills`, payload);
  },
  async update (trainerBillId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/trainerbills/${trainerBillId}`, payload);
  },
  async remove (trainerBillId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/trainerbills/${trainerBillId}`);
  },
};
