# Piano Ferie Bot

This bot allow you to insert you holidays from Telegram and see who has planned holidays in this week or in this month.

## How it works
The bot use name and surname of the Telegram user and store it with his holidays in Firestore.

## Implementation
The repository contains two files:
* **index.js**: it contains the functions actions and commands for the bot.
* **package.json**: it declares what I used to realize this bot:
  * firebase-admin
  * telegraf
  * telegraf-calendar-telegram