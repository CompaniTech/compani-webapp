import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const courseBillingItems = await alenviAxios.get(`${process.env.API_HOSTNAME}/coursebillingitems`, { params });
    return courseBillingItems.data.data.courseBillingItems;
  },
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebillingitems`, payload);
  },
  async delete (params) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/coursebillingitems/${params}`);
  },
};
