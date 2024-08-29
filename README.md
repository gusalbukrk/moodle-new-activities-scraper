# Moodle New Activities Scraper

This script is designed to scrape the Moodle for new activities and send an email with the details for each activity found. To run it, create a `.env` file with valid credentials (see example below) and execute `node .`.

```env
MOODLE_USERNAME=user
MOODLE_PASSWORD=pass
SMTP2GO_USERNAME=user
SMTP2GO_PASSWORD=pass
```

To run the script periodically, create a cron job. For example, `0 * * * * cd ~/moodle-new-activities-scraper/ && node .` will run the script every hour.
