import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

export interface SmsProvider {
  sendVerificationCode(phone: string, code: string): Promise<void>;
}

export class AwsSnsSmsProvider implements SmsProvider {
  private readonly client: SNSClient | undefined;

  constructor(region: string | undefined) {
    this.client = region ? new SNSClient({ region }) : undefined;
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    if (!this.client) {
      throw new Error("AWS_REGION is required to send verification SMS messages.");
    }
    await this.client.send(new PublishCommand({
      PhoneNumber: phone,
      Message: `رمز التحقق من رقم هاتفك هو ${code}. الرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.`,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    }));
  }
}
