import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/trainerbills`, payload);
  },
  async list (params) {
    const trainerBills = await alenviAxios.get(`${process.env.API_HOSTNAME}/trainerbills`, { params });
    return trainerBills.data.data.trainerBills;
  },
};
