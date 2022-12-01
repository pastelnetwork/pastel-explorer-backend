import dayjs from 'dayjs';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { getDateErrorFormat } from '../../utils/helpers';

const sendMail = async ({ content, subject }) => {
  const SMTP_HOST = process.env.SMTP_HOST as string;
  const SMTP_PORT = process.env.SMTP_PORT as string;
  const SMTP_SECURE = process.env.SMTP_SECURE as string;
  const SMTP_SENDER_NAME = process.env.SMTP_SENDER_NAME as string;
  const SMTP_EMAIL_ACCOUNT = process.env.SMTP_EMAIL_ACCOUNT as string;
  const SMTP_EMAIL_PASSWORD = process.env.SMTP_EMAIL_PASSWORD as string;
  const RECEIVED_EMAIL = process.env.RECEIVED_EMAIL as string;
  console.log();
  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_EMAIL_ACCOUNT ||
    !SMTP_EMAIL_PASSWORD ||
    !RECEIVED_EMAIL
  ) {
    return;
  }
  const smtpConfig: SMTPTransport.Options = {
    host: SMTP_HOST || '',
    port: Number(SMTP_PORT) || 0,
    secure: Boolean(SMTP_SECURE) || true,
    auth: {
      user: SMTP_EMAIL_ACCOUNT,
      pass: SMTP_EMAIL_PASSWORD,
    },
  };
  const transporter = nodemailer.createTransport(smtpConfig);
  const mailOptions = {
    from: {
      name: SMTP_SENDER_NAME || '',
      address: SMTP_EMAIL_ACCOUNT,
    },
    to: RECEIVED_EMAIL,
    subject,
    text: content,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`Send mail error >>> ${getDateErrorFormat()} >>>`, err);
  }
};

export async function sendEmailNotification(
  timestamp: number,
  lastBlock: string,
): Promise<void> {
  const CHECKING_TIME = process.env.CHECKING_TIME as string;
  if (!timestamp || !CHECKING_TIME) {
    return;
  }
  const now = dayjs();
  const lastTimeBlockUpdated = dayjs(timestamp * 1000);
  const checkingTime = parseInt(CHECKING_TIME, 10) * 60;
  const timeHasNoBlock = now.diff(lastTimeBlockUpdated, 'second');
  const repeat = timeHasNoBlock / checkingTime;
  if (repeat > 1 && timeHasNoBlock < checkingTime * Math.floor(repeat) + 5) {
    await sendMail({
      content: `Don't have any new blocks in the last ${Math.floor(
        timeHasNoBlock / 60,
      )} minutes. The last block is ${lastBlock}.`,
      subject: `[EXPLORER Notification] Don't have any new blocks in the last ${Math.floor(
        timeHasNoBlock / 60,
      )} minutes. The last block is ${lastBlock}.`,
    });
  }
}
