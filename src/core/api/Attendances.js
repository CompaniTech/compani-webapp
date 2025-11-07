import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list (params) {
    const attendanceSheets = await alenviAxios.get(`${process.env.API_HOSTNAME}/attendances`, { params });
    return attendanceSheets.data.data.attendances;
  },
  async listUnsubscribed (params) {
    const unsubscribedAttendances = await alenviAxios.get(
      `${process.env.API_HOSTNAME}/attendances/unsubscribed`,
      { params }
    );
    return unsubscribedAttendances.data.data.unsubscribedAttendances;
  },
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/attendances`, payload);
  },
  async update (params) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/attendances`, null, { params });
  },
  async delete (params) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/attendances`, { params });
  },
};
