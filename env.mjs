import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV,
  API_HOSTNAME: process.env.NODE_ENV === 'test' ? process.env.TEST_API_HOSTNAME : process.env.API_HOSTNAME,
  COMPANI_HOSTNAME: process.env.COMPANI_HOSTNAME,
  MESSENGER_LINK: process.env.MESSENGER_LINK,
  ENTERCODE_LINK: process.env.ENTERCODE_LINK,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  ALENVI_BOT_ID: process.env.ALENVI_BOT_ID,
  GA_TRACKING_ID: process.env.GA_TRACKING_ID,
  BULB_LINK: process.env.BULB_LINK,
  DETACHMENT_ALLOWED_COMPANY_IDS: process.env.DETACHMENT_ALLOWED_COMPANY_IDS,
  TRAINER_FEES_BILLING_ITEM: process.env.TRAINER_FEES_BILLING_ITEM,
};

export const parseEnv = environment => Object.keys(environment).reduce((acc, key) => {
  if (environment[key]) acc[key] = environment[key];
  return acc;
}, {});
