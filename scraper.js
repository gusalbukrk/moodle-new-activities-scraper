import 'dotenv/config'
import puppeteer from 'puppeteer';

const { MOODLE_USERNAME, MOODLE_PASSWORD } = process.env;

// scrape from Moodle activities not marked as done
async function scraper() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], });

  const page = (await browser.pages())[0];

  await page.goto('https://presencial.ifgoiano.edu.br/');

  await page.setViewport({width: 1080, height: 1024});

  await page.type('#inputName', MOODLE_USERNAME);
  await page.type('#inputPassword', MOODLE_PASSWORD);
  await page.click('#submit');

  await page.waitForSelector('.course-summaryitem h6');

  const currentCoursesWithUnfinishedActivities = await page.evaluate(() => {
    const d = new Date();
    const currentSemester = `${d.getFullYear()}/${d.getMonth() < 7 ? 1 : 2}`;

    const courses = document.querySelectorAll('.course-summaryitem');

    return Array.from(courses).reduce((currentCourses, course) => {
      const title = course.querySelector('h6').textContent;
      const link = course.querySelector('.aalink.coursename').getAttribute('href');
      const progress = parseInt(course.querySelector('.progress-bar').getAttribute('aria-valuenow'));

      if (title.includes(currentSemester) && progress < 100) {
        currentCourses.push({ title: title.split(' - ')[1], link });
      }

      return currentCourses;
    }, []);
  });

  // console.log(currentCoursesWithUnfinishedActivities);

  const activitiesNotMarkedAsDone = [];

  // iterate over every tab of every course to get activities not marked as done
  for (let course of currentCoursesWithUnfinishedActivities) {
    await page.goto(course.link);

    const courseTabs = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.nav-tabs li:not(.active)');

      return Array.from(tabs).map(tab =>
        ({ title: tab.textContent, link: tab.querySelector('a').getAttribute('href') })
      );
    });
    // console.log(course.title, courseTabs);

    // get activities from current tab
    // also useful for courses that don't have tabs
    activitiesNotMarkedAsDone.push(
      ...(await getActivitiesNotMarkedAsDoneInCurrentTab(browser, page, course))
    );

    for (let tab of courseTabs) {
      await page.goto(tab.link);
      activitiesNotMarkedAsDone.push(
        ...(await getActivitiesNotMarkedAsDoneInCurrentTab(browser, page, course))
      );
    }
  }

  // console.log(activitiesNotMarkedAsDone);

  await browser.close();

  return activitiesNotMarkedAsDone;
}

async function getActivitiesNotMarkedAsDoneInCurrentTab(browser, page, course) {
  const activitiesNotMarkedAsDone = await page.evaluate((course) => {
    const activities = document.querySelectorAll('.activity:has(.btn-outline-secondary)');

    return Array.from(activities).map(activity => {
      const id = activity.id.replace(/^module-/, '');
      const title = activity.querySelector('.btn-outline-secondary').getAttribute('data-activityname');
      const link = activity.querySelector('.activityinstance .aalink')?.getAttribute('href');
      const type = activity.className.split(' ').find(c => /^modtype_/.test(c)).replace('modtype_', '');

      return { course, id, title, link, type };
    });
  }, course);

  // add `dueDate` field to activities of type unequal to `resource`
  for (let activity of activitiesNotMarkedAsDone) {
    if (activity.link !== undefined && ['assign', 'quiz'].includes(activity.type)) {
      const page2 = await browser.newPage();
      await page2.goto(activity.link);
  
      activity.dueDate = await page2.evaluate(() => {
        return {
          date: document.querySelector('[data-region="activity-dates"]')?.children[1].innerText.replace(/(Vencimento|Fecha|Fechado): /, ''),
          timeLeft: [...document.querySelectorAll('.generaltable tr')].find(tr => tr.innerText.includes('Tempo restante'))?.children[1].innerText,
        };
      });

      await page2.close();
    }
  }

  return activitiesNotMarkedAsDone;
}

export default scraper;