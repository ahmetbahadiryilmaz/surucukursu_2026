import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { env } from '@surucukursu/shared';

@Injectable()
export class SlackService {
  async sendNotification(title: string, description: string, channel = 1): Promise<void> {
    try {
      const { notificationUrl, secretKey } = env.slack;
      
      await axios.post(notificationUrl, {
        title,
        description,
        channel
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': secretKey
        }
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      // Don't throw the error to avoid disrupting the login flow
    }
  }
}
