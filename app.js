'use strict'

// https://slack.com/bolt
const { WebClient } = require('@slack/web-api')
const { App, ExpressReceiver } = require('@slack/bolt')
const axios = require("axios")

const expressReceiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    processBeforeResponse: true
})

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: expressReceiver,
    processBeforeResponse: true
})
module.exports.expressApp = expressReceiver.app;

// If you need to use API methods that are not listed on https://api.slack.com/bot-users#methods
// you need to use user api token instead like this:
app.client = new WebClient(process.env.SLACK_API_TOKEN)

// React to "app_mention" events
app.event('app_mention', async ({ event, say }) => {
    const res = await app.client.users.info({ user: event.user });
    console.log(res)
    if (res.ok) {
      say({
        text: `Hi! <@${res.user.name}>`
      });
    } else {
      console.error(`Failed because of ${res.error}`)
    }
});
  

// React to message.channels event
app.message('hello', async({ message, say }) => {
    // say() sends a message to the channel where the vent was triggered
    await say({
        blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `Hey there <@${message.user}>!`
              },
              "accessory": {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Click Me"
                },
                "action_id": "button_click"
              }
            }
        ]
    })
})

// React to message.channels event
app.message('tell me a joke', async({ message, say }) => {
    
    // const options = {
    //     method: 'GET',
    //     url: 'https://dad-jokes.p.rapidapi.com/random/joke',
    //     headers: {
    //       'x-rapidapi-key': process.env.DAD_JOKE_API_KEY,
    //       'x-rapidapi-host': 'dad-jokes.p.rapidapi.com'
    //     }
    // };

    // const joke = await axios(options)
    const joke = await axios( { method: 'GET', url: 'https://mn9ndfr6t6.execute-api.us-west-2.amazonaws.com/dev/joke', headers: {'x-api-key': process.env.JOKE_API} })
    const { data } = joke;

    // say() sends a message to the channel where the vent was triggered
    const res = await say({
        blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `${data[0].sentense1.S}`
              }
            }
        ]
    })

    await say({text: `${data[0].sentense2.S}`, thread_ts: res.ts})
})

// Handle the click event (action_id: button_click) on a message posted by the above hello handler
app.action('button_click', async({ body, ack, say }) => {
    // Acknowledge the action
    await ack()
    await say(`<@${body.user.id}> clicked the button`)
})

// Handle /echo command invocations
app.command('/echo', async({ command, ack, say }) => {
    // Acknowledge command request
    await ack()
    await say(`You said "${command.text}"`)
})

// A simple example to use WebApi client
app.message('42', async ({ message }) => {
    // use chat.postMessage over say method
    const res = await app.client.chat.postMessage({
        channel: message.channel,
        text: 'The answer to life, the universe and everything',
        thread_ts: message.ts
    })
    if(res.ok) {
        console.log(`Succeeded ${JSON.stringify(res.message)}`)
    } else {
        console.error(`Failed because of ${res.error}`)
    }
})

// A simple example to use webhook internally
app.message('webhook', async({ message }) => {
    const { IncomingWebhook } = require('@slack/webhook');
    const url = process.env.SLACK_WEBHOOK_URL;
    const webhook = new IncomingWebhook(url);
    const res = await webhook.send({
        text: message.text.split("webhook")[1],
        unfurl_links: true
    });
    console.log(`Succeeded ${JSON.stringify(res)}`)
})

// Check the details of the error to handle cases where you should retry sending a message or stop the app
app.error(async(error) => {
    console.error(error)
})

// OAuth flow
module.exports.expressApp.get('/slack/installation', (req, res) => {
    const clientId = process.env.SLACK_CLIENT_ID;
    const scopeCsv = 'commands,users:read,users:read.email,team:read'
    const state = 'randomly-generated-string'
    const url = `https://slack.com/oauth/authorize?client_id${clientId}&scope=${scopeCsv}&state=${state}`
    res.redirect(url)
})

module.exports.expressApp.get('/slack/oauth', (req, res) => {
    app.client.oauth.access({
        code: req.query.code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
    }).then(apiRes => {
        if(apiRes.ok){
            console.log(`Succeeded! ${JSON.stringify(apiRes)}`)
            res.status(200).send(`Thanks!`)
        } else {
            console.error(`Failed because of ${apiRes.error}`)
            res.status(500).send(`Something went wrong! error ${apiRes.error}`)
        }
    }).catch(reason =>{
        console.error(`Failed because ${reason}`)
        res.status(500).send(`Something went wrong! reason: ${reason}`)
    })
})