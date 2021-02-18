const dotenv = require('dotenv');
const { Router } = require('express');
const express = require('express');
const basicAuth = require('express-basic-auth');
const webhook = require('./webhook');

dotenv.config();

const app = express();

// 
const user = process.env.USER_AUTH
const pass = process.env.PASS_AUTH

app.use(basicAuth({
    users: { user : pass }
}));

app.use(express.json());

const routes = Router();

routes.post('/compassoflights/webhook', webhook.webhook);

app.use(routes);

app.listen(3000);
