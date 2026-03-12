import twilio from "twilio";

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const FROM = process.env.TWILIO_PHONE_NUMBER || "";

export type SmsBookingData = {
  guestName: string;
  guestPhone: string;
  hostName: string;
  hostSmsNumber: string;
  title: string;
  startsAt: Date;
  guestTimezone: string;
  hostTimezone: string;
};

function formatShort(date: Date, tz: string) {
  return date.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function sendGuestConfirmationSms(data: SmsBookingData) {
  const client = getClient();
  if (!client || !FROM || !data.guestPhone) return;

  await client.messages.create({
    from: FROM,
    to: data.guestPhone,
    body: `✅ Confirmed: "${data.title}" with ${data.hostName}\n📅 ${formatShort(data.startsAt, data.guestTimezone)}\n\nSee you then!`,
  }).catch(() => {});
}

export async function sendHostNotificationSms(data: SmsBookingData) {
  const client = getClient();
  if (!client || !FROM || !data.hostSmsNumber) return;

  await client.messages.create({
    from: FROM,
    to: data.hostSmsNumber,
    body: `📅 New booking: ${data.guestName} booked "${data.title}"\n${formatShort(data.startsAt, data.hostTimezone)}`,
  }).catch(() => {});
}

export async function sendGuestReminderSms(data: SmsBookingData, label: string) {
  const client = getClient();
  if (!client || !FROM || !data.guestPhone) return;

  await client.messages.create({
    from: FROM,
    to: data.guestPhone,
    body: `🔔 Reminder: "${data.title}" with ${data.hostName} is ${label}\n📅 ${formatShort(data.startsAt, data.guestTimezone)}`,
  }).catch(() => {});
}

export async function sendHostReminderSms(data: SmsBookingData, label: string) {
  const client = getClient();
  if (!client || !FROM || !data.hostSmsNumber) return;

  await client.messages.create({
    from: FROM,
    to: data.hostSmsNumber,
    body: `🔔 Reminder: ${data.guestName} — "${data.title}" is ${label}\n📅 ${formatShort(data.startsAt, data.hostTimezone)}`,
  }).catch(() => {});
}
