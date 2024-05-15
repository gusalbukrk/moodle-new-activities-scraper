import 'dotenv/config'
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';

import scraper from './scraper.js';
import logger, { waitForLoggerToFinish, getErrorMessage } from './logger.js';

logger.debug(''); // empty line for separating logs from different runs
logger.debug('SCRIPT IS RUNNING');

try {
  var activitiesNotMarkedAsDone = await scraper();
} catch (e) {
  logger.error(getErrorMessage('SCRAPING ERROR', e));
  await waitForLoggerToFinish();
  process.exit(1);
}

const { SMTP2GO_USERNAME, SMTP2GO_PASSWORD } = process.env;
const smtpTransport = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: 2525, // 8025, 587 and 25 can also be used.
  auth: {
    user: SMTP2GO_USERNAME,
    pass: SMTP2GO_PASSWORD,
  },
});

const storedIds = JSON.parse(await fs.readFile('./activities.json', { encoding: 'utf8' }));
const activitiesNotYetStored = activitiesNotMarkedAsDone.filter(
  activity => !storedIds.some(id => id === activity.id)
);
// console.log('activitiesNotYetStored', activitiesNotYetStored);

// store and mail activities not previously processed
for (let activity of activitiesNotYetStored) {
  try {
    const title = `New activity added to ${activity?.course?.title} - ${activity.title}`;
    const html = `Title: ${activity.title}<br />Type: ${activity.type}<br />Course: <a href="${activity?.course?.link}">${activity?.course?.title}</a><br />Due date: ${activity?.dueDate?.date ?? 'N/A'}<br />Time left: ${activity?.dueDate?.timeLeft ?? 'N/A'}<br />Link: ${activity.link === undefined ? 'N/A' : `<a href="${activity.link}">${activity.link}</a>`}<br />`;

    const info = await smtpTransport.sendMail({
      from: "Moodle Scraper <contact@gusalbukrk.com>",
      to: "gusalbukrk@gmail.com",
      subject: title,
      text: html,
      html,
    });
    // console.log('info: ', info);

    storedIds.push(activity.id);
    await fs.writeFile('./activities.json', JSON.stringify(storedIds, null, 2));

    logger.debug(`MAILER SUCCESS: "${title}"`);
  } catch (e) {
    logger.error(getErrorMessage(`MAILER ERROR (activity: "${activity.title}")`, e));
    break;
  }
}
