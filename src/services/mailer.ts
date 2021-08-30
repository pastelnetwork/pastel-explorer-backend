import * as aws from 'aws-sdk';

import { ADMIN_EMAIL, AWS_REGION, EMAIL_FROM } from '../utils/constants';

aws.config.update({ region: AWS_REGION });

interface IMailerParams {
  to?: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export const sendMail = async ({
  to,
  subject = '',
  html = '',
  text = '',
}: IMailerParams): Promise<void> => {
  const mailTo = to && typeof to === 'string' ? [to] : ADMIN_EMAIL.split(',');
  try {
    const params = {
      Destination: {
        ToAddresses: mailTo,
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html || text,
          },
          Text: {
            Charset: 'UTF-8',
            Data: text || html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: EMAIL_FROM,
    };

    await new aws.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
  } catch (error) {
    console.error('Send email error:', error);
  }
};
