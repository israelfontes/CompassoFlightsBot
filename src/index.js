const dotenv = require('dotenv');
const { Router } = require('express');
const express = require('express');
const basicAuth = require('express-basic-auth');
const webhook = require('./webhook');

dotenv.config();

const app = express();

// 
const pass = process.env.PASS_AUTH

app.use(basicAuth({
    users: { "admin":pass }
}));

app.use(express.json());

const routes = Router();

routes.post('/compassoflights/webhook', webhook.webhook);
routes.get('/', function(req, res) {
    res.send('Compasso Flights!');
  })

app.use(routes);

app.listen(process.env.PORT);

console.log('On listen port: '+process.env.PORT);
