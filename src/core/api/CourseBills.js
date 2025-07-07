import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const courseBills = await alenviAxios.get(`${process.env.API_HOSTNAME}/coursebills`, { params });
    return courseBills.data.data.courseBills;
  },
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebills`, payload);
  },
  async update (billId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/coursebills/${billId}`, payload);
  },
  async updateBillList (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebills/list-edition`, payload);
  },
  async addBillingPurchase (billId, payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebills/${billId}/billingpurchases`, payload);
  },
  async updateBillingPurchase (billId, billingPurchaseId, payload) {
    const url = `${process.env.API_HOSTNAME}/coursebills/${billId}/billingpurchases/${billingPurchaseId}`;
    await alenviAxios.put(url, payload);
  },
  async getPdf (id) {
    return alenviAxios.get(
      `${process.env.API_HOSTNAME}/coursebills/${id}/pdfs`,
      { responseType: 'arraybuffer', headers: { Accept: 'application/pdf' } }
    );
  },
  async deleteBillingPurchase (billId, billingPurchaseId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/coursebills/${billId}/billingpurchases/${billingPurchaseId}`);
  },

  async deleteBillList (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebills/list-deletion`, payload);
  },

  async createList (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/coursebills/list-creation`, payload);
  },
};
