import dayjs from 'dayjs';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { getDateErrorFormat } from '../../utils/helpers';

const sendMail = async ({ content, subject }): Promise<void> => {
  const SMTP_SENDER_NAME = process.env.SMTP_SENDER_NAME as string;
  const RECEIVED_EMAIL = process.env.RECEIVED_EMAIL as string;
  const GOOGLE_EMAIL_ACCOUNT = process.env.GOOGLE_EMAIL_ACCOUNT as string;
  const GOOGLE_MAILER_CLIENT_ID = process.env.GOOGLE_MAILER_CLIENT_ID as string;
  const GOOGLE_MAILER_CLIENT_SECRET = process.env
    .GOOGLE_MAILER_CLIENT_SECRET as string;
  const GOOGLE_MAILER_REFRESH_TOKEN = process.env
    .GOOGLE_MAILER_REFRESH_TOKEN as string;

  if (
    !SMTP_SENDER_NAME ||
    !RECEIVED_EMAIL ||
    !GOOGLE_EMAIL_ACCOUNT ||
    !GOOGLE_MAILER_CLIENT_ID ||
    !GOOGLE_MAILER_CLIENT_SECRET ||
    !GOOGLE_MAILER_REFRESH_TOKEN
  ) {
    return;
  }
  const myOAuth2Client = new OAuth2Client(
    GOOGLE_MAILER_CLIENT_ID,
    GOOGLE_MAILER_CLIENT_SECRET,
  );
  myOAuth2Client.setCredentials({
    refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
  });
  const myAccessTokenObject = await myOAuth2Client.getAccessToken();
  const myAccessToken = myAccessTokenObject?.token;

  const smtpConfig: SMTPTransport.Options = {
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      clientId: GOOGLE_MAILER_CLIENT_ID,
      clientSecret: GOOGLE_MAILER_CLIENT_SECRET,
      user: GOOGLE_EMAIL_ACCOUNT,
      accessToken: myAccessToken,
      refreshToken: GOOGLE_MAILER_REFRESH_TOKEN,
    },
  };
  const transporter = nodemailer.createTransport(smtpConfig);
  const mailOptions = {
    from: {
      name: SMTP_SENDER_NAME || 'Pastel Network',
      address: GOOGLE_EMAIL_ACCOUNT,
    },
    to: RECEIVED_EMAIL,
    subject,
    html: content,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`Send mail error >>> ${getDateErrorFormat()} >>>`, err);
  }
};

export async function sendNotificationEmail(
  timestamp: number,
  lastBlockHeight: string,
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
  if (repeat > 1 && timeHasNoBlock < checkingTime * Math.floor(repeat) + 60) {
    const url = process.env.DEFAULT_ALLOWED_ORIGIN as string;
    const serverName = process.env.EXPLORER_SERVER as string;
    await sendMail({
      content: `Don't have any new blocks in the last ${Math.floor(
        timeHasNoBlock / 60,
      )} minutes. The last block is ${lastBlockHeight}.<br />From: <a href="${url}">${url}</a>`,
      subject: `[EXPLORER ${serverName} Notification] Don't have any new blocks in the last ${Math.floor(
        timeHasNoBlock / 60,
      )} minutes. The last block is ${lastBlockHeight}.`,
    });
  }
}
