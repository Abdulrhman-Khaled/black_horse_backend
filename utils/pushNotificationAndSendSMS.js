import axios from "axios";
import admin from "firebase-admin";
import Notification from "../models/notificationSchema.js";
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: "black-f35fa",
    private_key_id: "27ea8443114907a64b2a088d35d1dc41d289b790",
    private_key:"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCr2todG0mbk32G\nLmmLYriXCstwtddVZpR9kVeOxJSTSy3MHuRWAJW1hyYgzQepXERWffsHiTDsXMOY\nIutT5RHezLfmCE2V4/mZB9DMX0mxBbHzBVkPKsSD1Qp7ilFVWxzzU+rB/tbo0mOe\n3iqWy79JE/zImRBUV5XuTmerLHAuDsWyuGn9Oef6lK94K1fawCCqV2ed4K8BI71M\nL0FzUFnICqiwjv0nKB7Wj4dwOJWmbG/mjN6Gs3LTzZlS65zpdQ+ibbqrbkW8Sufi\nrwyxakk126I4HlN2pFjF4StO6e+VEDExHNxYVRavkkcWkmIh+xg+g3IgVXks8spO\nNkXaXl5hAgMBAAECggEACxPl6GdoZMNqnXojao04CeBzwbWvBj3BB6EVTEomq6H2\nd0hsfpC2Fcf68LVWr5eXfh3Lzy4MPcgzAX0Kv1MuRjbbCdRyL93Mqo0i6/Gefe84\ni8pF9eDTXw4eCV2epYpkgNjhcpTbRJG/Qy/d/e9vSqYjrsiTEWS98OkT7KhGKOnG\nzQD4fOlKIZONl9b5VoPJX375fnq0oZv3mAIRku98NY7gTNGk5lBRaW/kGiaF1NVV\nL6UCTRM41QVD8eKZZNy0OU48jFqcl+YwDIQXZ28F+7r/eHxHQhtVkRbCpNiYt06A\n0fy6WfRpXeWDnU6UC5ZF4W8nsK0GQtzo3SNMROZPAwKBgQDZEXrMVFqh3qATuj1g\nXplikhUG5itgARmHz2p7/o+O/CwG6nh0zATo8ARQwaqMtRk6+5CAK2Q5723KWBgQ\n3IHKyJdAF4oSMy8vC9cIVn51QZhldTzmRTonDhSDzYOdE/Z7BqkbMB7GUMvri+42\ny+b1Lmgu7jTWDUsq85keYlcIBwKBgQDKrW9Wdo7qy3gRP+j8ovUWrFeHBNapXUPq\nxTwtK7pUYi4V7hYvpEwpZtf1r+FjygRGhfSlQJV+BU3ITgalM5N8uPcew9DAlC5M\neeBqMKhqrbJFyp9EoQhJQ+ofHwh7LAlfW8bYan3NGCdvs5gt/hmfhT3yo8xJkLjR\nniv9y488VwKBgBzaJO9Z2v4fADn/DD9t84dVkXPsTiGho8oYeLfoex5vSE7XBZHI\nuHJZzMkLJOc0/xiG7YsLuXO17mrx0KkVFi9lAC2ls1V99iyTr05NaNufD2mU7rZQ\nx0z/oxxtyausRpvNo9aYS87iWGiDnfMsoRM/yttKED3PYIlh/Z07RwQrAoGAArWG\nw3UaO/E0Taa5CodzFzZ+hQN/iwwAGGdCgqgO+YnGa+yex0w+6F7DjDkpnhfZLsgj\nmQHf/as8euzwEc06r3QZeYPMioZwh/0pDsJPvf1MYLpwno44eiI6Qug7SMox5eBo\nLARgYhlsjYWtBxBab1NsnI2r8V/J2KNwmxfZdkkCgYBYPNC//lc0T+06D4ONyOjM\nNSebQ1cx9cs48gwNaq7+bV8/FcLyoaFYvM8kXu8e8rgw8pasKyj9moaWKecAOAQN\n+hM3KGn32oWlc4KAHgLZIXIdzXqPnmZV+7acs5WJIz6jR39vlIXjG4tuY1F1Ibna\n1R/yc+0QW+aL6fzATSBb8w==\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-6txsv@black-f35fa.iam.gserviceaccount.com",
    client_id: "113747911682100197404",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-6txsv%40black-f35fa.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  }),
});
const messaging = admin.messaging();

export const pushNotification = async (title, body, type, customerId, supplierId, deliveryBoyId, deviceToken) => {
  const newNotification = new Notification({
    title: title,
    body: body,
    type: type,
    customerId: customerId,
    supplierId: supplierId,
    deliveryBoyId: deliveryBoyId,
  });
  await newNotification.save();

  try {
    if (typeof deviceToken === "string") { // push single notification
      const message = {
        android: { priority: "high", notification: { title: title, body: body } },
        token: deviceToken,
      };
      await messaging.send(message);
    } else if (Array.isArray(deviceToken)) { // push multiple notifications
      const messages = deviceToken.map((token) => ({
        android: { priority: "high", notification: { title: title, body: body } },
        token: token,
      }));
      await Promise.all(messages.map((message) => messaging.send(message)));
    }
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
  }
};

export const return5RandomNumber = () => Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;

export const sendSMS = async (phoneNumber, code, type) => {
  try {
    let message;
    switch (type) {
      case "verify":
        message = `كود التفعيل الخاص بك هو ${code}`;
        break;
      case "forget":
        message = `كود تغيير كلمة المرور الخاصة بك هو ${code}`;
        break;
      case "changePhone":
        message = `كود لطلب تغير رقم الهاتف الخاص بك هو ${code}`;
        break;
      default:
        message = code.toString();
    }

    const response = await axios.post(
      'https://plus.smssmartegypt.com/api/PlusSMS/SendSMS', null,
      {
        params: {
          username: "Ss15883",
          password: "szl559120",
          sendername: "Blackhorse",
          mobiles: phoneNumber,
          message: message
        }
    });

    console.log({... response});
    console.log(`SMS sent successfully: ${phoneNumber}-${message}`);
  } catch (error) {
    console.error("Error sending SMS:");
  }
};
